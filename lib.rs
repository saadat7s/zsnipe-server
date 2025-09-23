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

        // Validate Token 2022 mint (basic only, no extensions)
        require!(
            ctx.accounts.token_mint.to_account_info().owner == &spl_token_2022::ID,
            ErrorCode::InvalidTokenProgram
        );

        // Set the authority as program PDA for rug-proof design
        let (program_authority, authority_bump) =
            Pubkey::find_program_address(&[b"program_authority"], ctx.program_id);

        staking_pool.authority = program_authority;
        staking_pool.authority_bump = authority_bump;
        staking_pool.initializer = ctx.accounts.admin.key();
        staking_pool.total_staked_amount = 0;
        staking_pool.mint_address = ctx.accounts.token_mint.key();
        staking_pool.escrow_account = ctx.accounts.escrow_token_account.key(); // Fixed field name
        staking_pool.bump = ctx.bumps.staking_pool;
        staking_pool.created_at = clock.unix_timestamp;
        staking_pool.is_active = true;
        staking_pool.token_price_usd_micro = 1000;
        staking_pool.price_last_updated = clock.unix_timestamp;

        msg!(
            "Staking Pool initialized with Token 2022 mint called ZSNIPE: {}",
            ctx.accounts.token_mint.key()
        );
        msg!("Pool Authority set to program PDA: {}", program_authority);
        msg!(
            "Escrow account created: {}",
            ctx.accounts.escrow_token_account.key()
        );
        msg!(
            "Initial token price set to: {} micro-USD",
            staking_pool.token_price_usd_micro
        );

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

        msg!(
            "Staked {} tokens for user {}",
            amount,
            ctx.accounts.staker.key()
        );

        Ok(())
    }

    // pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
    //     require!(amount > 0, ErrorCode::InvalidAmount);

    //     let user_staking_account = &mut ctx.accounts.user_staking_account;
    //     let staking_pool = &mut ctx.accounts.staking_pool;
    //     let clock = Clock::get()?;

    //     require!(
    //         user_staking_account.staked_amount >= amount,
    //         ErrorCode::InsufficientStakedBalance
    //     );

    //     // Create signer seeds for PDA - Fixed syntax
    //     let authority_bump = &[staking_pool.authority_bump];
    //     let authority_seeds = &[b"program_authority".as_ref(), authority_bump.as_ref()];
    //     let signer_seeds = &[&authority_seeds[..]];

    //     // Transfer tokens from escrow back to user
    //     transfer_checked(
    //         CpiContext::new_with_signer(
    //             ctx.accounts.token_program.to_account_info(),
    //             TransferChecked {
    //                 from: ctx.accounts.escrow_token_account.to_account_info(),
    //                 mint: ctx.accounts.token_mint.to_account_info(),
    //                 to: ctx.accounts.staker_token_account.to_account_info(),
    //                 authority: ctx.accounts.program_authority.to_account_info(),
    //             },
    //             signer_seeds,
    //         ),
    //         amount,
    //         ctx.accounts.token_mint.decimals,
    //     )?;

    //     // Update balances
    //     user_staking_account.staked_amount = user_staking_account
    //         .staked_amount
    //         .checked_sub(amount)
    //         .ok_or(ErrorCode::InsufficientStakedBalance)?;
    //     user_staking_account.last_updated = clock.unix_timestamp;

    //     staking_pool.total_staked_amount = staking_pool
    //         .total_staked_amount
    //         .checked_sub(amount)
    //         .ok_or(ErrorCode::InsufficientStakedBalance)?;

    //     msg!(
    //         "Unstaked {} tokens for user {}",
    //         amount,
    //         ctx.accounts.staker.key()
    //     );

    //     Ok(())
    // }

    #[derive(Accounts)]
    pub struct InitializeStakingPool<'info> {
        #[account(mut)]
        pub admin: Signer<'info>,

        #[account(
        init,
        payer = admin,
        space = 8 + 32 + 1 + 32 + 8 + 32 + 32 + 1 + 8 + 1 + 8 + 8,
        seeds = [b"staking_poolV2"],
        bump
    )]
        pub staking_pool: Account<'info, StakingPool>,

        /// Program authority PDA that will own the escrow account
        /// CHECK: This is safe because we derive it with seeds
        #[account(
        seeds = [b"program_authority"],
        bump
    )]
        pub program_authority: UncheckedAccount<'info>,

        // Escrow token account using PDA seeds
        #[account(
        init,
        payer = admin,
        token::mint = token_mint,  
        token::authority = program_authority,
        seeds = [b"escrow", staking_pool.key().as_ref()],
        bump
    )]
        pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

        // Token 2022 mint - this is your ZSNIPE token
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
        constraint = staking_pool.mint_address == token_mint.key() @ ErrorCode::InvalidTokenMint,
    )]
        pub staking_pool: Account<'info, StakingPool>,

        #[account(
        init_if_needed,
        payer = staker,
        space = 8 + 32 + 8 + 8 + 8 + 1,
        seeds = [b"user_stake", staker.key().as_ref()],
        bump,
    )]
        pub user_staking_account: Account<'info, UserStakingAccount>,

        /// Program authority PDA that owns the escrow account
        /// CHECK: This is safe because we derive it with seeds
        #[account(
        seeds = [b"program_authority"],
        bump = staking_pool.authority_bump
    )]
        pub program_authority: UncheckedAccount<'info>,

        // Pool's escrow token account (using PDA seeds)
        #[account(
        mut,
        seeds = [b"escrow", staking_pool.key().as_ref()],
        bump,
        constraint = escrow_token_account.key() == staking_pool.escrow_account @ ErrorCode::InvalidTokenMint,
        constraint = escrow_token_account.owner == program_authority.key() @ ErrorCode::InvalidTokenMint,
    )]
        pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

        // User Token Account for ZSNIPE
        #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = staker,
        associated_token::token_program = token_program
    )]
        pub staker_token_account: InterfaceAccount<'info, TokenAccount>,

        // Token 2022 mint
        #[account(
        constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram
    )]
        pub token_mint: InterfaceAccount<'info, Mint>,

        pub system_program: Program<'info, System>,
        pub token_program: Interface<'info, TokenInterface>,
    }

    // #[derive(Accounts)]
    // pub struct Unstake<'info> {
    //     #[account(mut)]
    //     pub staker: Signer<'info>,

    //     #[account(
    //     mut,
    //     seeds = [b"staking_poolV2"],
    //     bump = staking_pool.bump,
    //     constraint = staking_pool.is_active @ ErrorCode::PoolNotActive,
    // )]
    //     pub staking_pool: Account<'info, StakingPool>,

    //     #[account(
    //     mut,
    //     seeds = [b"user_stake", staker.key().as_ref()],
    //     bump = user_staking_account.bump,
    //     constraint = user_staking_account.staker == staker.key() @ ErrorCode::UnauthorizedStaker,
    // )]
    //     pub user_staking_account: Account<'info, UserStakingAccount>,

    //     /// Program authority PDA that owns the escrow account
    //     /// CHECK: This is safe because we derive it with seeds
    //     #[account(
    //     seeds = [b"program_authority"],
    //     bump = staking_pool.authority_bump
    // )]
    //     pub program_authority: UncheckedAccount<'info>,

    //     // Pool's escrow token account (using PDA seeds)
    //     #[account(
    //     mut,
    //     seeds = [b"escrow", staking_pool.key().as_ref()],
    //     bump,
    //     constraint = escrow_token_account.key() == staking_pool.escrow_account @ ErrorCode::InvalidTokenMint,
    //     constraint = escrow_token_account.owner == program_authority.key() @ ErrorCode::InvalidTokenMint,
    // )]
    //     pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

    //     // User Token Account for ZSNIPE
    //     #[account(
    //     mut,
    //     associated_token::mint = token_mint,
    //     associated_token::authority = staker,
    //     associated_token::token_program = token_program
    // )]
    //     pub staker_token_account: InterfaceAccount<'info, TokenAccount>,

    //     // Token 2022 mint
    //     #[account(
    //     constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram
    // )]
    //     pub token_mint: InterfaceAccount<'info, Mint>,

    //     pub token_program: Interface<'info, TokenInterface>,
    // }

    #[account]
    pub struct StakingPool {
        pub authority: Pubkey,          // Program PDA for true decentralization
        pub authority_bump: u8,         // Authority PDA bump
        pub initializer: Pubkey,        // Admin who initialized the account
        pub total_staked_amount: u64,   // Total staked amount by all stakers
        pub mint_address: Pubkey,       // ZSNIPE's mint address
        pub escrow_account: Pubkey,     // Escrow token account where staked tokens are held
        pub bump: u8,                   // PDA bump
        pub created_at: i64,            // Pool creation timestamp
        pub is_active: bool,            // Pool status
        pub token_price_usd_micro: u64, // Token price in micro-USD (6 decimals)
        pub price_last_updated: i64,    // When price was last updated
    }

    #[account]
    pub struct UserStakingAccount {
        pub staker: Pubkey,
        pub staked_amount: u64,
        pub timestamp: i64,
        pub last_updated: i64,
        pub bump: u8,
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
    }
}
