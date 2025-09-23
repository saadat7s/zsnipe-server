use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("629dBzrHwL12uJS1nN8VyomiWgRTtVWqdmSUJLcpxjyu"); // Add your program ID here

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
        let (program_authority, _) =
            Pubkey::find_program_address(&[b"program_authority"], ctx.program_id);

        staking_pool.authority = program_authority;
        staking_pool.initializer = ctx.accounts.admin.key();
        staking_pool.total_staked_amount = 0;
        staking_pool.mint_address = ctx.accounts.token_mint.key();
        staking_pool.bump = ctx.bumps.staking_pool;
        staking_pool.created_at = clock.unix_timestamp;
        staking_pool.is_active = true;

        msg!(
            "Staking Pool initialized with Token 2022 mint called ZSNIPE: {}",
            ctx.accounts.token_mint.key()
        );
        msg!("Pool Authority set to program PDA: {}", program_authority);
        msg!("Basic Token 2022 - no extensions supported yet");

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeStakingPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 8 + 32 + 1 + 8 + 1, 
        seeds = [b"staking_pool"],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    // Token 2022 mint - this is your ZSNIPE token
    #[account(
        constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[account]
pub struct StakingPool {
    pub authority: Pubkey,        // Program PDA for true decentralization
    pub initializer: Pubkey,      // Admin who initialized the account
    pub total_staked_amount: u64, // Total staked amount by all stakers
    pub mint_address: Pubkey,     // ZSNIPE's mint address
    pub bump: u8,                 // PDA bump
    pub created_at: i64,          // Pool creation timestamp
    pub is_active: bool,          // Pool status
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
}
