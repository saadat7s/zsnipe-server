use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("758R2jFfces6Ue5B9rLmRrh8NesiU9dCtDa4bUSBpCMt");

// Proposal creation requirements
// pub const MIN_STAKE_TO_PROPOSE: u64 = 10_000_000_000;
// pub const MAX_STAKE_DURATION_TO_PROPOSE: i64 = 30 * 86400;
pub const PROPOSAL_DEPOSIT_AMOUNT: u64 = 100_000_000;
pub const MAX_ACTIVE_PROPOSALS: u8 = 3;
//change these for testing:
pub const MIN_STAKE_TO_PROPOSE: u64 = 100_000_000; // 100 ZSNIPE (instead of 10,000)
pub const MAX_STAKE_DURATION_TO_PROPOSE: i64 = 0 * 86400; // 1 day (instead of 30)

//cast vote constants
pub const MIN_STAKE_DURATION_FOR_VOTING: i64 = 0 * 86400;
pub const VOTE_LOCK_PERIOD: i64 = 0 * 86400;

// String length limits
pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_DESCRIPTION_LENGTH: usize = 1000;
pub const MAX_EXECUTION_DATA_LENGTH: usize = 500;

// Voting configuration parameters
pub const VOTING_PERIOD_3_DAYS: u8 = 3;
pub const VOTING_PERIOD_7_DAYS: u8 = 7;
pub const VOTING_PERIOD_14_DAYS: u8 = 14;
pub const VALID_VOTING_PERIODS: [u8; 3] = [
    VOTING_PERIOD_3_DAYS,
    VOTING_PERIOD_7_DAYS,
    VOTING_PERIOD_14_DAYS,
];

// Seeds
pub const PROPOSAL_SEED: &[u8] = b"proposalV1";
pub const PROPOSAL_ESCROW_SEED: &[u8] = b"proposal_escrowV1";
pub const VOTE_SEED: &[u8] = b"voteV1";
pub const STAKING_POOL_SEED: &[u8] = b"staking_poolV3";
pub const PROGRAM_AUTHORITY_SEED: &[u8] = b"program_authorityV1";
pub const USER_STAKE_SEED: &[u8] = b"user_stakeV1";
pub const STAKING_POOL_ESCROW_SEED: &[u8] = b"escrowV1";
pub const GOVERNANCE_SEED: &[u8] = b"governanceV1";

// Governance Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ProposalType {
    /// Text-only proposal for signaling/discussion
    Text = 0,

    /// Transfer tokens from treasury to recipient
    TreasuryTransfer = 1,

    /// Update governance parameters
    ParameterUpdate = 2,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ProposalStatus {
    /// Proposal is currently accepting votes
    Active = 0,

    /// Voting ended, proposal passed, waiting for timelock
    Passed = 1,

    /// Voting ended, proposal failed (quorum not met or threshold not reached)
    Failed = 2,

    /// Proposal was executed successfully
    Executed = 3,

    /// Proposal was cancelled before/during voting
    Cancelled = 4,

    /// Proposal passed but execution failed
    ExecutionFailed = 5,

    /// Proposal cancelled by admin during timelock (emergency)
    EmergencyCancelled = 6,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum VoteChoice {
    /// Vote in favor of the proposal
    Yes = 0,

    /// Vote against the proposal
    No = 1,

    /// Participate without taking a stance (counts for quorum only)
    Abstain = 2,
}

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
            Pubkey::find_program_address(&[PROGRAM_AUTHORITY_SEED], ctx.program_id);

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
        let authority_seeds = &[PROGRAM_AUTHORITY_SEED.as_ref(), authority_bump.as_ref()];
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

    /// Initialize the proposal escrow account (one-time setup)
    /// This holds all proposal deposits
    pub fn initialize_proposal_escrow(ctx: Context<InitializeProposalEscrow>) -> Result<()> {
        msg!("✅ Proposal escrow account initialized");
        msg!(
            "🔐 Escrow address: {}",
            ctx.accounts.proposal_escrow.key()
        );
        Ok(())
    }

    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        proposal_id: u64, // Changed to u64 to match PDA derivation
        title: String,
        description: String,
        proposal_type: ProposalType,
        execution_data: Vec<u8>,
        voting_period: u8,
    ) -> Result<()> {
        let proposer_staking = &ctx.accounts.proposer_staking_account;
        let proposal = &mut ctx.accounts.proposal_account;
        let clock = Clock::get()?;

        // ===== VALIDATION 1: Stake Amount =====
        require!(
            proposer_staking.staked_amount >= MIN_STAKE_TO_PROPOSE,
            ErrorCode::InsufficientStakeToPropose
        );

        // ===== VALIDATION 2: Stake Duration =====
        let stake_duration = clock.unix_timestamp - proposer_staking.timestamp;
        require!(
            stake_duration >= MAX_STAKE_DURATION_TO_PROPOSE,
            ErrorCode::InsufficientStakeDurationToPropose
        );

        // ===== VALIDATION 3: String Length Limits =====
        require!(
            title.len() <= MAX_TITLE_LENGTH,
            ErrorCode::ProposalTitleTooLong
        );

        require!(
            description.len() <= MAX_DESCRIPTION_LENGTH,
            ErrorCode::ProposalDescriptionTooLong
        );

        // ===== VALIDATION 4: Execution Data Size =====
        require!(
            execution_data.len() <= MAX_EXECUTION_DATA_LENGTH,
            ErrorCode::ExecutionDataTooLarge
        );

        // ===== VALIDATION 5: Voting Period =====
        require!(
            VALID_VOTING_PERIODS.contains(&voting_period),
            ErrorCode::InvalidVotingPeriod
        );

        // ===== TRANSFER DEPOSIT FROM PROPOSER TO ESCROW =====
        transfer_checked(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TransferChecked {
                    from: ctx.accounts.proposer_token_account.to_account_info(),
                    mint: ctx.accounts.deposit_token_mint.to_account_info(),
                    to: ctx.accounts.deposit_escrow_account.to_account_info(),
                    authority: ctx.accounts.proposer.to_account_info(),
                },
            ),
            PROPOSAL_DEPOSIT_AMOUNT,
            ctx.accounts.deposit_token_mint.decimals,
        )?;

        // ===== CALCULATE VOTING END TIME =====
        let voting_ends_at = clock
            .unix_timestamp
            .checked_add((voting_period as i64) * 86400)
            .ok_or(ErrorCode::InvalidAmount)?;

        // ===== INITIALIZE PROPOSAL ACCOUNT =====
        proposal.proposal_id = proposal_id;
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.title = title.clone();
        proposal.description = description;
        proposal.proposal_type = proposal_type;
        proposal.status = ProposalStatus::Active;
        proposal.execution_data = execution_data;
        proposal.voting_period_days = voting_period;
        proposal.created_at = clock.unix_timestamp;
        proposal.voting_ends_at = voting_ends_at;
        proposal.finalized_at = 0;
        proposal.executed_at = 0;
        proposal.timelock_end = 0;
        proposal.yes_votes = 0;
        proposal.no_votes = 0;
        proposal.abstain_votes = 0;
        proposal.total_voters = 0;
        proposal.deposit_amount = PROPOSAL_DEPOSIT_AMOUNT;
        proposal.deposit_refunded = false;
        proposal.bump = ctx.bumps.proposal_account;
        proposal.reserved = [0; 32];

        // ===== LOG SUCCESS =====
        msg!(
            "✅ Proposal #{} created by {}",
            proposal_id,
            ctx.accounts.proposer.key()
        );
        msg!("📋 Title: {}", title);
        msg!("🗳️  Type: {:?}", proposal.proposal_type);
        msg!("⏰ Voting ends at: {} (Unix timestamp)", voting_ends_at);
        msg!(
            "💰 Deposit: {} ZSNIPE",
            PROPOSAL_DEPOSIT_AMOUNT / 1_000_000
        );

        Ok(())
    }

    pub fn cast_vote(ctx: Context<CastVote>, vote_choice: VoteChoice) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal_account;
        let governance_account = &mut ctx.accounts.governance_account;
        let user_staking_account = &ctx.accounts.user_staking_account;
        let vote_record = &mut ctx.accounts.vote_record;
        let clock = Clock::get()?;

        // ===== VALIDATION 1: Proposal Must Be Active =====
        require!(
            proposal.status == ProposalStatus::Active,
            ErrorCode::ProposalNotActive
        );

        // ===== VALIDATION 2: Voting Period Not Ended =====
        require!(
            clock.unix_timestamp < proposal.voting_ends_at,
            ErrorCode::VotingPeriodEnded
        );

        // ===== VALIDATION 3: Stake Duration Requirement (30+ days) =====
        let stake_duration = clock.unix_timestamp - user_staking_account.timestamp;
        require!(
            stake_duration >= MIN_STAKE_DURATION_FOR_VOTING,
            ErrorCode::InsufficientStakeDurationToVote
        );

        // ===== VALIDATION 4: Voting Power Must Be Calculated =====
        require!(
            governance_account.voting_power_cache > 0,
            ErrorCode::VotingPowerNotCalculated
        );

        // ===== GET VOTING POWER (from cache, no recalculation) =====
        let voting_power = governance_account.voting_power_cache;

        // ===== UPDATE PROPOSAL VOTE COUNTS =====
        match vote_choice {
            VoteChoice::Yes => {
                proposal.yes_votes = proposal
                    .yes_votes
                    .checked_add(voting_power)
                    .ok_or(ErrorCode::InvalidAmount)?;
            }
            VoteChoice::No => {
                proposal.no_votes = proposal
                    .no_votes
                    .checked_add(voting_power)
                    .ok_or(ErrorCode::InvalidAmount)?;
            }
            VoteChoice::Abstain => {
                proposal.abstain_votes = proposal
                    .abstain_votes
                    .checked_add(voting_power)
                    .ok_or(ErrorCode::InvalidAmount)?;
            }
        }

        // ===== INCREMENT TOTAL VOTERS =====
        proposal.total_voters = proposal
            .total_voters
            .checked_add(1)
            .ok_or(ErrorCode::InvalidAmount)?;

        // ===== SET TOKEN LOCK (voting_ends_at + 3 days) =====
        let lock_end = proposal
            .voting_ends_at
            .checked_add(VOTE_LOCK_PERIOD)
            .ok_or(ErrorCode::InvalidAmount)?;

        governance_account.stake_lock_end = lock_end;
        governance_account.last_vote_timestamp = clock.unix_timestamp;
        governance_account.participation_count = governance_account
            .participation_count
            .checked_add(1)
            .ok_or(ErrorCode::InvalidAmount)?;

        // ===== INITIALIZE VOTE RECORD (prevents double voting) =====
        vote_record.voter = ctx.accounts.voter.key();
        vote_record.proposal_id = proposal.proposal_id;
        vote_record.vote_choice = vote_choice;
        vote_record.voting_power = voting_power;
        vote_record.voted_at = clock.unix_timestamp;
        vote_record.bump = ctx.bumps.vote_record;

        // ===== LOG SUCCESS =====
        msg!("✅ Vote cast successfully!");
        msg!("👤 Voter: {}", ctx.accounts.voter.key());
        msg!("📋 Proposal: #{}", proposal.proposal_id);
        msg!("🗳️  Choice: {:?}", vote_choice);
        msg!("⚡ Voting Power: {}", voting_power);
        msg!("🔒 Tokens locked until: {} (Unix timestamp)", lock_end);

        Ok(())
    }

}

fn calculate_hybrid_voting_power(stake_amount: u64, stake_duration_days: u32) -> u64 {
    // Convert micro-tokens to tokens for calculation
    let tokens = stake_amount / 1_000_000; // 999,000,000 / 1,000,000 = 999

    let base_power = if tokens <= 100_000 {
        tokens // Returns 999
    } else {
        100_000 + ((tokens - 100_000) as f64).sqrt() as u64
    };

    let time_multiplier = match stake_duration_days {
        0..=30 => 100, // 0 days = 100
        31..=90 => 120,
        91..=365 => 150,
        _ => 200,
    };

    (base_power * time_multiplier) / 100 // (999 × 100) / 100 = 999
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

// Individual Proposal Account
#[account]
pub struct ProposalAccount {
    pub proposal_id: u64,            // 8 bytes
    pub proposer: Pubkey,            // 32 bytes
    pub title: String,               // 4 + 100 = 104 bytes
    pub description: String,         // 4 + 500 = 504 bytes (optimized)
    pub proposal_type: ProposalType, // 1 byte
    pub status: ProposalStatus,      // 1 byte
    pub execution_data: Vec<u8>,     // 4 + 300 = 304 bytes (optimized)
    pub voting_period_days: u8,      // 1 byte
    pub created_at: i64,             // 8 bytes
    pub voting_ends_at: i64,         // 8 bytes
    pub finalized_at: i64,           // 8 bytes
    pub executed_at: i64,            // 8 bytes
    pub timelock_end: i64,           // 8 bytes
    pub yes_votes: u64,              // 8 bytes
    pub no_votes: u64,               // 8 bytes
    pub abstain_votes: u64,          // 8 bytes
    pub total_voters: u32,           // 4 bytes
    pub deposit_amount: u64,         // 8 bytes
    pub deposit_refunded: bool,      // 1 byte
    pub bump: u8,                    // 1 byte
    pub reserved: [u8; 32],          // 32 bytes
}

// Vote record
#[account]
pub struct VoteRecord {
    pub voter: Pubkey,           // 32 bytes
    pub proposal_id: u64,        // 8 bytes
    pub vote_choice: VoteChoice, // 1 byte
    pub voting_power: u64,       // 8 bytes
    pub voted_at: i64,           // 8 bytes
    pub bump: u8,                // 1 byte
}
// Total: 58 bytes + 8 discriminator = 66 bytes (using 82 for safety)

// === ACCOUNT CONTEXTS ===

#[derive(Accounts)]
pub struct InitializeStakingPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 163, // Much smaller space requirement
        seeds = [STAKING_POOL_SEED],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        seeds = [PROGRAM_AUTHORITY_SEED],
        bump
    )]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        token::mint = token_mint,  
        token::authority = program_authority,
        seeds = [STAKING_POOL_ESCROW_SEED, staking_pool.key().as_ref()],
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
        seeds = [STAKING_POOL_SEED],
        bump = staking_pool.bump,
        constraint = staking_pool.is_active @ ErrorCode::PoolNotActive,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init_if_needed,
        payer = staker,
        space = 8 + 57, // Much smaller space
        seeds = [USER_STAKE_SEED, staker.key().as_ref()],
        bump,
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    #[account(
        seeds = [PROGRAM_AUTHORITY_SEED],
        bump = staking_pool.authority_bump
    )]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [STAKING_POOL_ESCROW_SEED, staking_pool.key().as_ref()],
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
        seeds = [STAKING_POOL_SEED],
        bump = staking_pool.bump,
        constraint = staking_pool.is_active @ ErrorCode::PoolNotActive,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        mut,
        seeds = [USER_STAKE_SEED, staker.key().as_ref()],
        bump = user_staking_account.bump,
        constraint = user_staking_account.staker == staker.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    // Optional governance account - only needed if user participates in governance
    #[account(
        seeds = [GOVERNANCE_SEED, staker.key().as_ref()],
        bump = governance_account.bump,
    )]
    pub governance_account: Option<Account<'info, GovernanceAccount>>,

    #[account(
        seeds = [PROGRAM_AUTHORITY_SEED],
        bump = staking_pool.authority_bump
    )]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [STAKING_POOL_ESCROW_SEED, staking_pool.key().as_ref()],
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
        seeds = [GOVERNANCE_SEED, staker.key().as_ref()],
        bump
    )]
    pub governance_account: Account<'info, GovernanceAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CalculateVotingPower<'info> {
    pub staker: Signer<'info>,

    #[account(
        seeds = [USER_STAKE_SEED, staker.key().as_ref()],
        bump = user_staking_account.bump,
        constraint = user_staking_account.staker == staker.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    #[account(
        mut,
        seeds = [GOVERNANCE_SEED, staker.key().as_ref()],
        bump = governance_account.bump,
    )]
    pub governance_account: Account<'info, GovernanceAccount>,
}

#[derive(Accounts)]
pub struct InitializeProposalEscrow<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Staking pool (to get program authority)
    #[account(
        seeds = [STAKING_POOL_SEED],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    /// Program authority (owns the escrow)
    #[account(
        seeds = [PROGRAM_AUTHORITY_SEED],
        bump = staking_pool.authority_bump
    )]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    /// Proposal escrow token account
    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = program_authority,
        seeds = [PROPOSAL_ESCROW_SEED],
        bump
    )]
    pub proposal_escrow: InterfaceAccount<'info, TokenAccount>,

    /// The token mint (ZSNIPE)
    #[account(
        constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram
    )]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct CreateProposal<'info> {
    /// The proposer who is creating the proposal
    #[account(mut)]
    pub proposer: Signer<'info>,

    /// The proposer's staking account (to verify stake amount and duration)
    #[account(
        seeds = [USER_STAKE_SEED, proposer.key().as_ref()],
        bump = proposer_staking_account.bump,
        constraint = proposer_staking_account.staker == proposer.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub proposer_staking_account: Account<'info, UserStakingAccount>,

    /// The proposer's governance account (to verify voting power is calculated)
    #[account(
        seeds = [GOVERNANCE_SEED, proposer.key().as_ref()],
        bump = proposer_governance_account.bump,
        constraint = proposer_governance_account.staker == proposer.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub proposer_governance_account: Account<'info, GovernanceAccount>,

    /// The proposal account to create
    #[account(
        init,
        payer = proposer,
        space = 8 + 2700,  // discriminator + ProposalAccount size
        seeds = [PROPOSAL_SEED, proposal_id.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal_account: Account<'info, ProposalAccount>,

    /// Staking pool (to access program authority for escrow)
    #[account(
        seeds = [STAKING_POOL_SEED],
        bump = staking_pool.bump,
    )]
    pub staking_pool: Account<'info, StakingPool>,

    /// Program authority (for signing deposit transfer to escrow)
    #[account(
        seeds = [PROGRAM_AUTHORITY_SEED],
        bump = staking_pool.authority_bump
    )]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    /// Proposer's token account (for deposit transfer)
    #[account(
        mut,
        associated_token::mint = deposit_token_mint,
        associated_token::authority = proposer,
        associated_token::token_program = token_program,
    )]
    pub proposer_token_account: InterfaceAccount<'info, TokenAccount>,

    /// Deposit escrow account (holds proposal deposits)
    #[account(
        mut,
        seeds = [PROPOSAL_ESCROW_SEED],
        bump,
    )]
    pub deposit_escrow_account: InterfaceAccount<'info, TokenAccount>,

    /// The token mint (ZSNIPE)
    #[account(
        constraint = deposit_token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram
    )]
    pub deposit_token_mint: InterfaceAccount<'info, Mint>,

    /// System program
    pub system_program: Program<'info, System>,

    /// Token program (Token-2022)
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(vote_choice: VoteChoice)]
pub struct CastVote<'info> {
    /// The voter casting their vote
    #[account(mut)]
    pub voter: Signer<'info>,

    /// The voter's staking account (to verify stake duration)
    #[account(
        seeds = [USER_STAKE_SEED, voter.key().as_ref()],
        bump = user_staking_account.bump,
        constraint = user_staking_account.staker == voter.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    /// The voter's governance account (for voting power and lock)
    #[account(
        mut,
        seeds = [GOVERNANCE_SEED, voter.key().as_ref()],
        bump = governance_account.bump,
        constraint = governance_account.staker == voter.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub governance_account: Account<'info, GovernanceAccount>,

    /// The proposal being voted on
    #[account(
        mut,
        seeds = [PROPOSAL_SEED, proposal_account.proposal_id.to_le_bytes().as_ref()],
        bump = proposal_account.bump,
    )]
    pub proposal_account: Account<'info, ProposalAccount>,

    /// Vote record (PDA ensures uniqueness - prevents double voting)
    #[account(
        init,
        payer = voter,
        space = 8 + 82, // discriminator + VoteRecord size
        seeds = [VOTE_SEED, proposal_account.proposal_id.to_le_bytes().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub system_program: Program<'info, System>,
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

    //Proposal creation error codes:
    #[msg(
        "Insufficient stake amount to create proposal - minimum 10,000 ZSNIPE tokens must be staked"
    )]
    InsufficientStakeToPropose,

    #[msg("Insufficient stake duration to create proposal - minimum 30 days required")]
    InsufficientStakeDurationToPropose,

    #[msg("Insufficient deposit  - 1000 ZSNIPE tokens required to create a proposal")]
    InsufficientDepositToPropose,

    #[msg("Maximum Active proposals reached - You have 3 active proposals already")]
    MaxActiveProposalsReached,

    #[msg("Proposal title too longs - Max 100 Characters")]
    ProposalTitleTooLong,

    #[msg("Proposal description too long - max 1000 characters")]
    ProposalDescriptionTooLong,

    #[msg("Execution data too large - max 500 bytes")]
    ExecutionDataTooLarge,

    #[msg("Invalid voting period - must be 3, 7, or 14 days")]
    InvalidVotingPeriod,

    #[msg("Proposal is not active - cannot vote")]
    ProposalNotActive,

    #[msg("Voting period has ended")]
    VotingPeriodEnded,

    #[msg("Insufficient stake duration to vote - minimum 30 days required")]
    InsufficientStakeDurationToVote,

    #[msg("Voting power not calculated - call calculate_voting_power first")]
    VotingPowerNotCalculated,

    #[msg("Already voted on this proposal - vote changes not allowed")]
    AlreadyVoted,
}
