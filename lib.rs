use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("629dBzrHwL12uJS1nN8VyomiWgRTtVWqdmSUJLcpxjyu");

#[program]
pub mod zero_sided_snipe {
    use super::*;

    pub fn initialize_staking_pool(ctx: Context<InitializeStakingPool>) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        let clock = Clock::get()?;

        // Validate Token 2022 mint
        require!(
            ctx.accounts.token_mint.to_account_info().owner == &spl_token_2022::ID,
            ErrorCode::InvalidTokenProgram
        );

        // Set the authority as program PDA
        let (program_authority, authority_bump) =
            Pubkey::find_program_address(&[b"program_authority"], ctx.program_id);

        staking_pool.authority = program_authority;
        staking_pool.authority_bump = authority_bump;
        staking_pool.initializer = ctx.accounts.admin.key();
        staking_pool.total_staked_amount = 0;
        staking_pool.mint_address = ctx.accounts.token_mint.key();
        staking_pool.escrow_account = ctx.accounts.escrow_token_account.key();
        staking_pool.bump = ctx.bumps.staking_pool;
        staking_pool.created_at = clock.unix_timestamp;
        staking_pool.is_active = true;
        staking_pool.token_price_usd_micro = 1000;
        staking_pool.price_last_updated = clock.unix_timestamp;

        Ok(())
    }

    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let staking_pool = &mut ctx.accounts.staking_pool;
        let user_staking_account = &mut ctx.accounts.user_staking_account;
        let clock = Clock::get()?;

        // Initialize user staking account if first time
        if user_staking_account.staker == Pubkey::default() {
            user_staking_account.staker = ctx.accounts.staker.key();
            user_staking_account.staked_amount = 0;
            user_staking_account.timestamp = clock.unix_timestamp;
            user_staking_account.bump = ctx.bumps.user_staking_account;
        }

        // Transfer tokens from user to escrow
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.staker_token_account.to_account_info(),
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.escrow_token_account.to_account_info(),
                    authority: ctx.accounts.staker.to_account_info(),
                },
            ),
            amount,
            ctx.accounts.token_mint.decimals,
        )?;

        // Update balances
        user_staking_account.staked_amount = user_staking_account
            .staked_amount
            .checked_add(amount)
            .ok_or(ErrorCode::InvalidAmount)?;
        user_staking_account.last_updated = clock.unix_timestamp;

        staking_pool.total_staked_amount = staking_pool
            .total_staked_amount
            .checked_add(amount)
            .ok_or(ErrorCode::InvalidAmount)?;

        Ok(())
    }

    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let user_staking_account = &mut ctx.accounts.user_staking_account;
        let staking_pool = &mut ctx.accounts.staking_pool;

        require!(
            user_staking_account.staked_amount >= amount,
            ErrorCode::InsufficientStakedBalance
        );

        // Check if tokens are locked due to governance participation
        if let Some(governance_account) = &ctx.accounts.governance_account {
            let clock = Clock::get()?;
            require!(
                clock.unix_timestamp >= governance_account.stake_lock_end,
                ErrorCode::TokensLockedForGovernance
            );
        }

        let authority_bump = &[staking_pool.authority_bump];
        let authority_seeds = &[b"program_authority".as_ref(), authority_bump.as_ref()];
        let signer_seeds = &[&authority_seeds[..]];

        transfer_checked(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    mint: ctx.accounts.token_mint.to_account_info(),
                    to: ctx.accounts.staker_token_account.to_account_info(),
                    authority: ctx.accounts.program_authority.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
            ctx.accounts.token_mint.decimals,
        )?;

        user_staking_account.staked_amount = user_staking_account
            .staked_amount
            .checked_sub(amount)
            .ok_or(ErrorCode::InsufficientStakedBalance)?;
        user_staking_account.last_updated = Clock::get()?.unix_timestamp;

        staking_pool.total_staked_amount = staking_pool
            .total_staked_amount
            .checked_sub(amount)
            .ok_or(ErrorCode::InsufficientStakedBalance)?;

        Ok(())
    }

    // NEW: Initialize governance account separately
    pub fn initialize_governance_account(ctx: Context<InitializeGovernanceAccount>) -> Result<()> {
        let governance_account = &mut ctx.accounts.governance_account;
        let clock = Clock::get()?;

        governance_account.staker = ctx.accounts.staker.key();
        governance_account.participation_count = 0;
        governance_account.last_vote_timestamp = 0;
        governance_account.stake_lock_end = 0;
        governance_account.voting_power_cache = 0;
        governance_account.created_at = clock.unix_timestamp;
        governance_account.bump = ctx.bumps.governance_account;

        Ok(())
    }

    // NEW: Calculate voting power (separate from staking)
    pub fn calculate_voting_power(ctx: Context<CalculateVotingPower>) -> Result<u64> {
        let user_staking_account = &ctx.accounts.user_staking_account;
        let governance_account = &mut ctx.accounts.governance_account;
        let clock = Clock::get()?;

        // Calculate stake duration in days
        let stake_duration_seconds = clock.unix_timestamp - user_staking_account.timestamp;
        let stake_duration_days = (stake_duration_seconds / 86400) as u32;

        // Implement hybrid linear-quadratic calculation
        let voting_power =
            calculate_hybrid_voting_power(user_staking_account.staked_amount, stake_duration_days);

        // Cache the result
        governance_account.voting_power_cache = voting_power;

        Ok(voting_power)
    }
}

// Hybrid voting power calculation function
fn calculate_hybrid_voting_power(stake_amount: u64, stake_duration_days: u32) -> u64 {
    // Base power calculation (linear up to 100K, then quadratic)
    let base_power = if stake_amount <= 100_000 {
        stake_amount
    } else {
        100_000 + ((stake_amount - 100_000) as f64).sqrt() as u64
    };

    // Time multiplier based on stake duration
    let time_multiplier = match stake_duration_days {
        0..=30 => 100,   // 1.0x
        31..=90 => 120,  // 1.2x
        91..=365 => 150, // 1.5x
        _ => 200,        // 2.0x maximum
    };

    (base_power * time_multiplier) / 100
}

// === ACCOUNT STRUCTURES ===

// Clean staking pool - no governance bloat
#[account]
pub struct StakingPool {
    pub authority: Pubkey,          // 32 bytes
    pub authority_bump: u8,         // 1 byte
    pub initializer: Pubkey,        // 32 bytes
    pub total_staked_amount: u64,   // 8 bytes
    pub mint_address: Pubkey,       // 32 bytes
    pub escrow_account: Pubkey,     // 32 bytes
    pub bump: u8,                   // 1 byte
    pub created_at: i64,            // 8 bytes
    pub is_active: bool,            // 1 byte
    pub token_price_usd_micro: u64, // 8 bytes
    pub price_last_updated: i64,    // 8 bytes
}
// Total: 161 bytes (much smaller!)

// Clean user staking - just the essentials
#[account]
pub struct UserStakingAccount {
    pub staker: Pubkey,     // 32 bytes
    pub staked_amount: u64, // 8 bytes
    pub timestamp: i64,     // 8 bytes
    pub last_updated: i64,  // 8 bytes
    pub bump: u8,           // 1 byte
}
// Total: 57 bytes (much smaller!)

// Separate governance account - only created when needed
#[account]
pub struct GovernanceAccount {
    pub staker: Pubkey,           // 32 bytes
    pub participation_count: u32, // 4 bytes
    pub last_vote_timestamp: i64, // 8 bytes
    pub stake_lock_end: i64,      // 8 bytes
    pub voting_power_cache: u64,  // 8 bytes
    pub created_at: i64,          // 8 bytes
    pub bump: u8,                 // 1 byte
}
// Total: 69 bytes (only exists when user participates in governance)

// === ACCOUNT CONTEXTS ===

#[derive(Accounts)]
pub struct InitializeStakingPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 161, // Much smaller space requirement
        seeds = [b"staking_poolV2"],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        seeds = [b"program_authority"],
        bump
    )]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        token::mint = token_mint,  
        token::authority = program_authority,
        seeds = [b"escrow", staking_pool.key().as_ref()],
        bump
    )]
    pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(
        mut,
        seeds = [b"staking_poolV2"],
        bump = staking_pool.bump,
        constraint = staking_pool.is_active @ ErrorCode::PoolNotActive,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init_if_needed,
        payer = staker,
        space = 8 + 57, // Much smaller space
        seeds = [b"user_stake", staker.key().as_ref()],
        bump,
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    #[account(
        seeds = [b"program_authority"],
        bump = staking_pool.authority_bump
    )]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"escrow", staking_pool.key().as_ref()],
        bump,
        constraint = escrow_token_account.key() == staking_pool.escrow_account @ ErrorCode::InvalidTokenMint,
    )]
    pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = staker,
        associated_token::token_program = token_program
    )]
    pub staker_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(
        mut,
        seeds = [b"staking_poolV2"],
        bump = staking_pool.bump,
        constraint = staking_pool.is_active @ ErrorCode::PoolNotActive,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [b"user_stake", staker.key().as_ref()],
        bump = user_staking_account.bump,
        constraint = user_staking_account.staker == staker.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    // Optional governance account - only needed if user participates in governance
    #[account(
        seeds = [b"governance", staker.key().as_ref()],
        bump = governance_account.bump,
    )]
    pub governance_account: Option<Account<'info, GovernanceAccount>>,

    #[account(
        seeds = [b"program_authority"],
        bump = staking_pool.authority_bump
    )]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [b"escrow", staking_pool.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = staker,
        associated_token::token_program = token_program
    )]
    pub staker_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct InitializeGovernanceAccount<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(
        init,
        payer = staker,
        space = 8 + 69,
        seeds = [b"governance", staker.key().as_ref()],
        bump
    )]
    pub governance_account: Account<'info, GovernanceAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CalculateVotingPower<'info> {
    pub staker: Signer<'info>,

    #[account(
        seeds = [b"user_stake", staker.key().as_ref()],
        bump = user_staking_account.bump,
        constraint = user_staking_account.staker == staker.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    #[account(
        mut,
        seeds = [b"governance", staker.key().as_ref()],
        bump = governance_account.bump,
    )]
    pub governance_account: Account<'info, GovernanceAccount>,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Stake amount below minimum requirement")]
    InsufficientStakeAmount,

    #[msg("User does not own this staking account")]
    UnauthorizedStaker,

    #[msg("Insufficient staked balance for unstaking")]
    InsufficientStakedBalance,

    #[msg("Staking pool is not active")]
    PoolNotActive,

    #[msg("Invalid token mint address")]
    InvalidTokenMint,

    #[msg("Must use Token 2022 program")]
    InvalidTokenProgram,

    #[msg("Invalid amount - must be greater than 0")]
    InvalidAmount,

    #[msg("Pool already initialized")]
    PoolAlreadyInitialized,

    #[msg("Unauthorized - only admin can perform this action")]
    Unauthorized,

    #[msg("Invalid price - must be between 100 and 10,000,000 micro-USD")]
    InvalidPrice,

    #[msg("Price is stale - admin must update token price")]
    StalePrice,

    #[msg("Tokens are currently locked for governance participation")]
    TokensLockedForGovernance,
}
