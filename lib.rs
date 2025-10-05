use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};

declare_id!("758R2jFfces6Ue5B9rLmRrh8NesiU9dCtDa4bUSBpCMt");

// Proposal creation requirements
pub const PROPOSAL_DEPOSIT_AMOUNT: u64 = 100_000_000;
pub const MAX_ACTIVE_PROPOSALS: u8 = 3;
pub const MIN_STAKE_TO_PROPOSE: u64 = 100_000_000; // 100 ZSNIPE (testing)
pub const MAX_STAKE_DURATION_TO_PROPOSE: i64 = 0 * 86400; // 0 days (testing)

// Cast vote constants
pub const MIN_STAKE_DURATION_FOR_VOTING: i64 = 0 * 86400;
pub const VOTE_LOCK_PERIOD: i64 = 0 * 86400;

// String length limits
pub const MAX_TITLE_LENGTH: usize = 100;
pub const MAX_DESCRIPTION_LENGTH: usize = 1000;
pub const MAX_EXECUTION_DATA_LENGTH: usize = 500;

// Voting configuration parameters
pub const VOTING_PERIOD_3_DAYS: u8 = 0;
pub const VOTING_PERIOD_7_DAYS: u8 = 0;
pub const VOTING_PERIOD_14_DAYS: u8 = 0;
pub const VALID_VOTING_PERIODS: [u8; 3] = [
    VOTING_PERIOD_3_DAYS,
    VOTING_PERIOD_7_DAYS,
    VOTING_PERIOD_14_DAYS,
];

pub const QUORUM_PERCENTAGE: u64 = 10;
pub const PASSING_THRESHOLD_PERCENTAGE: u64 = 51;
pub const TIME_LOCK_DURATION: i64 = 0 * 86400;

// Seeds
pub const PROPOSAL_SEED: &[u8] = b"proposalV1";
pub const PROPOSAL_ESCROW_SEED: &[u8] = b"proposal_escrowV1";
pub const VOTE_SEED: &[u8] = b"voteV1";
pub const STAKING_POOL_SEED: &[u8] = b"staking_poolV3";
pub const PROGRAM_AUTHORITY_SEED: &[u8] = b"program_authorityV1";
pub const USER_STAKE_SEED: &[u8] = b"user_stakeV1";
pub const STAKING_POOL_ESCROW_SEED: &[u8] = b"escrowV1";
pub const GOVERNANCE_SEED: &[u8] = b"governanceV1";
pub const GOVERNANCE_CONFIG_SEED: &[u8] = b"governance_configV1";

// Governance Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ProposalType {
    Text = 0,
    TreasuryTransfer = 1,
    ParameterUpdate = 2,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum ProposalStatus {
    Active = 0,
    Passed = 1,
    Failed = 2,
    Executed = 3,
    Cancelled = 4,
    ExecutionFailed = 5,
    EmergencyCancelled = 6,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub enum VoteChoice {
    Yes = 0,
    No = 1,
    Abstain = 2,
}

#[program]
pub mod zero_sided_snipe {
    use super::*;

    pub fn initialize_staking_pool(ctx: Context<InitializeStakingPool>) -> Result<()> {
        let staking_pool = &mut ctx.accounts.staking_pool;
        let clock = Clock::get()?;

        require!(
            ctx.accounts.token_mint.to_account_info().owner == &spl_token_2022::ID,
            ErrorCode::InvalidTokenProgram
        );

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

        if user_staking_account.staker == Pubkey::default() {
            user_staking_account.staker = ctx.accounts.staker.key();
            user_staking_account.staked_amount = 0;
            user_staking_account.timestamp = clock.unix_timestamp;
            user_staking_account.bump = ctx.bumps.user_staking_account;
        }

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

    pub fn initialize_governance_config(ctx: Context<InitializeGovernanceConfig>) -> Result<()> {
        let governance_config = &mut ctx.accounts.governance_config;
        let clock = Clock::get()?;

        governance_config.authority = ctx.accounts.authority.key();
        governance_config.quorum_percentage = QUORUM_PERCENTAGE;
        governance_config.passing_threshold = PASSING_THRESHOLD_PERCENTAGE;
        governance_config.timelock_duration = TIME_LOCK_DURATION;
        governance_config.min_stake_to_propose = MIN_STAKE_TO_PROPOSE;
        governance_config.proposal_deposit = PROPOSAL_DEPOSIT_AMOUNT;
        governance_config.created_at = clock.unix_timestamp;
        governance_config.last_updated = clock.unix_timestamp;
        governance_config.bump = ctx.bumps.governance_config;
        governance_config.reserved = [0; 32];

        msg!("✅ Governance config initialized");
        msg!("   Authority: {}", ctx.accounts.authority.key());
        msg!("   Quorum: {}%", governance_config.quorum_percentage);
        msg!("   Threshold: {}%", governance_config.passing_threshold);
        msg!(
            "   Timelock: {} seconds",
            governance_config.timelock_duration
        );

        Ok(())
    }

    pub fn calculate_voting_power(ctx: Context<CalculateVotingPower>) -> Result<u64> {
        let user_staking_account = &ctx.accounts.user_staking_account;
        let governance_account = &mut ctx.accounts.governance_account;
        let clock = Clock::get()?;

        let stake_duration_seconds = clock.unix_timestamp - user_staking_account.timestamp;
        let stake_duration_days = (stake_duration_seconds / 86400) as u32;

        let voting_power =
            calculate_hybrid_voting_power(user_staking_account.staked_amount, stake_duration_days);

        governance_account.voting_power_cache = voting_power;

        Ok(voting_power)
    }

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
        proposal_id: u64,
        title: String,
        description: String,
        proposal_type: ProposalType,
        execution_data: Vec<u8>,
        voting_period: u8,
    ) -> Result<()> {
        let proposer_staking = &ctx.accounts.proposer_staking_account;
        let proposal = &mut ctx.accounts.proposal_account;
        let clock = Clock::get()?;

        require!(
            proposer_staking.staked_amount >= MIN_STAKE_TO_PROPOSE,
            ErrorCode::InsufficientStakeToPropose
        );

        let stake_duration = clock.unix_timestamp - proposer_staking.timestamp;
        require!(
            stake_duration >= MAX_STAKE_DURATION_TO_PROPOSE,
            ErrorCode::InsufficientStakeDurationToPropose
        );

        require!(
            title.len() <= MAX_TITLE_LENGTH,
            ErrorCode::ProposalTitleTooLong
        );
        require!(
            description.len() <= MAX_DESCRIPTION_LENGTH,
            ErrorCode::ProposalDescriptionTooLong
        );
        require!(
            execution_data.len() <= MAX_EXECUTION_DATA_LENGTH,
            ErrorCode::ExecutionDataTooLarge
        );
        require!(
            VALID_VOTING_PERIODS.contains(&voting_period),
            ErrorCode::InvalidVotingPeriod
        );

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

        let voting_ends_at = clock
            .unix_timestamp
            .checked_add((voting_period as i64) * 86400)
            .ok_or(ErrorCode::InvalidAmount)?;

        proposal.proposal_id = proposal_id;
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.title = title;
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

        Ok(())
    }

    pub fn cast_vote(ctx: Context<CastVote>, vote_choice: VoteChoice) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal_account;
        let governance_account = &mut ctx.accounts.governance_account;
        let user_staking_account = &ctx.accounts.user_staking_account;
        let vote_record = &mut ctx.accounts.vote_record;
        let clock = Clock::get()?;

        require!(
            proposal.status == ProposalStatus::Active,
            ErrorCode::ProposalNotActive
        );
        require!(
            clock.unix_timestamp < proposal.voting_ends_at,
            ErrorCode::VotingPeriodEnded
        );

        let stake_duration = clock.unix_timestamp - user_staking_account.timestamp;
        require!(
            stake_duration >= MIN_STAKE_DURATION_FOR_VOTING,
            ErrorCode::InsufficientStakeDurationToVote
        );
        require!(
            governance_account.voting_power_cache > 0,
            ErrorCode::VotingPowerNotCalculated
        );

        let voting_power = governance_account.voting_power_cache;

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

        proposal.total_voters = proposal
            .total_voters
            .checked_add(1)
            .ok_or(ErrorCode::InvalidAmount)?;

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

        vote_record.voter = ctx.accounts.voter.key();
        vote_record.proposal_id = proposal.proposal_id;
        vote_record.vote_choice = vote_choice;
        vote_record.voting_power = voting_power;
        vote_record.voted_at = clock.unix_timestamp;
        vote_record.bump = ctx.bumps.vote_record;

        Ok(())
    }

    pub fn finalize_proposal(ctx: Context<FinalizeProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal_account;
        let staking_pool = &ctx.accounts.staking_pool;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= proposal.voting_ends_at,
            ErrorCode::VotingPeriodNotEnded
        );
        require!(
            proposal.status == ProposalStatus::Active,
            ErrorCode::ProposalNotActive
        );
        require!(
            proposal.finalized_at == 0,
            ErrorCode::ProposalAlreadyFinalized
        );

        let total_votes_cast = proposal
            .yes_votes
            .checked_add(proposal.no_votes)
            .ok_or(ErrorCode::InvalidAmount)?
            .checked_add(proposal.abstain_votes)
            .ok_or(ErrorCode::InvalidAmount)?;

        let total_voting_power = staking_pool.total_staked_amount / 1_000_000;

        let quorum_required = total_voting_power
            .checked_mul(QUORUM_PERCENTAGE)
            .ok_or(ErrorCode::InvalidAmount)?
            .checked_div(100)
            .ok_or(ErrorCode::InvalidAmount)?;

        let quorum_met = total_votes_cast >= quorum_required;

        if !quorum_met {
            proposal.status = ProposalStatus::Failed;
            proposal.finalized_at = clock.unix_timestamp;

            transfer_deposit_to_proposer(
                &ctx.accounts.deposit_escrow_account,
                &ctx.accounts.proposer_token_account,
                &ctx.accounts.token_mint,
                &ctx.accounts.program_authority,
                &ctx.accounts.token_program,
                proposal.deposit_amount,
                ctx.accounts.staking_pool.authority_bump,
            )?;

            proposal.deposit_refunded = true;
            return Ok(());
        }

        let yes_no_total = proposal
            .yes_votes
            .checked_add(proposal.no_votes)
            .ok_or(ErrorCode::InvalidAmount)?;

        if yes_no_total == 0 {
            proposal.status = ProposalStatus::Failed;
            proposal.finalized_at = clock.unix_timestamp;

            transfer_deposit_to_proposer(
                &ctx.accounts.deposit_escrow_account,
                &ctx.accounts.proposer_token_account,
                &ctx.accounts.token_mint,
                &ctx.accounts.program_authority,
                &ctx.accounts.token_program,
                proposal.deposit_amount,
                ctx.accounts.staking_pool.authority_bump,
            )?;

            proposal.deposit_refunded = true;
            return Ok(());
        }

        let yes_percentage = proposal
            .yes_votes
            .checked_mul(100)
            .ok_or(ErrorCode::InvalidAmount)?
            .checked_div(yes_no_total)
            .ok_or(ErrorCode::InvalidAmount)?;
        let threshold_met = yes_percentage >= PASSING_THRESHOLD_PERCENTAGE;

        if !threshold_met {
            proposal.status = ProposalStatus::Failed;
            proposal.finalized_at = clock.unix_timestamp;

            transfer_deposit_to_proposer(
                &ctx.accounts.deposit_escrow_account,
                &ctx.accounts.proposer_token_account,
                &ctx.accounts.token_mint,
                &ctx.accounts.program_authority,
                &ctx.accounts.token_program,
                proposal.deposit_amount,
                ctx.accounts.staking_pool.authority_bump,
            )?;

            proposal.deposit_refunded = true;
            return Ok(());
        }

        proposal.status = ProposalStatus::Passed;
        proposal.finalized_at = clock.unix_timestamp;
        proposal.timelock_end = clock
            .unix_timestamp
            .checked_add(TIME_LOCK_DURATION)
            .ok_or(ErrorCode::InvalidAmount)?;

        Ok(())
    }

    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal_account;
        let clock = Clock::get()?;

        require!(
            proposal.status == ProposalStatus::Passed,
            ErrorCode::ProposalNotPassed
        );
        require!(
            clock.unix_timestamp >= proposal.timelock_end,
            ErrorCode::TimelockNotExpired
        );
        require!(
            proposal.executed_at == 0,
            ErrorCode::ProposalAlreadyExecuted
        );

        let execution_result = match proposal.proposal_type {
            ProposalType::Text => Ok(()),
            ProposalType::TreasuryTransfer => execute_treasury_transfer(
                ctx.accounts
                    .treasury_account
                    .as_ref()
                    .ok_or(ErrorCode::MissingTreasuryAccount)?,
                ctx.accounts
                    .recipient_account
                    .as_ref()
                    .ok_or(ErrorCode::MissingRecipientAccount)?,
                ctx.accounts
                    .token_mint
                    .as_ref()
                    .ok_or(ErrorCode::MissingTokenMint)?,
                &ctx.accounts.program_authority,
                ctx.accounts
                    .token_program
                    .as_ref()
                    .ok_or(ErrorCode::MissingTokenProgram)?,
                &proposal.execution_data,
                ctx.accounts.staking_pool.authority_bump,
            ),
            ProposalType::ParameterUpdate => execute_parameter_update(
                ctx.accounts
                    .governance_config
                    .as_mut()
                    .ok_or(ErrorCode::MissingGovernanceConfig)?,
                &proposal.execution_data,
            ),
        };

        match execution_result {
            Ok(_) => {
                proposal.status = ProposalStatus::Executed;
                proposal.executed_at = clock.unix_timestamp;

                transfer_deposit_to_proposer(
                    &ctx.accounts.deposit_escrow_account,
                    &ctx.accounts.proposer_token_account,
                    &ctx.accounts.deposit_token_mint,
                    &ctx.accounts.program_authority,
                    &ctx.accounts.token_program_for_deposit,
                    proposal.deposit_amount,
                    ctx.accounts.staking_pool.authority_bump,
                )?;

                proposal.deposit_refunded = true;
            }
            Err(e) => {
                proposal.status = ProposalStatus::ExecutionFailed;
                proposal.executed_at = clock.unix_timestamp;

                transfer_deposit_to_proposer(
                    &ctx.accounts.deposit_escrow_account,
                    &ctx.accounts.proposer_token_account,
                    &ctx.accounts.deposit_token_mint,
                    &ctx.accounts.program_authority,
                    &ctx.accounts.token_program_for_deposit,
                    proposal.deposit_amount,
                    ctx.accounts.staking_pool.authority_bump,
                )?;

                proposal.deposit_refunded = true;
                return Err(e);
            }
        }

        Ok(())
    }
}

fn execute_treasury_transfer<'info>(
    treasury_account: &InterfaceAccount<'info, TokenAccount>,
    recipient_account: &InterfaceAccount<'info, TokenAccount>,
    token_mint: &InterfaceAccount<'info, Mint>,
    program_authority: &UncheckedAccount<'info>,
    token_program: &Interface<'info, TokenInterface>,
    execution_data: &[u8],
    authority_bump: u8,
) -> Result<()> {
    require!(execution_data.len() >= 40, ErrorCode::InvalidExecutionData);

    let amount_bytes: [u8; 8] = execution_data[32..40]
        .try_into()
        .map_err(|_| ErrorCode::InvalidExecutionData)?;
    let amount = u64::from_le_bytes(amount_bytes);

    require!(
        treasury_account.amount >= amount,
        ErrorCode::InsufficientTreasuryBalance
    );

    let authority_bump_arr = &[authority_bump];
    let authority_seeds = &[PROGRAM_AUTHORITY_SEED.as_ref(), authority_bump_arr.as_ref()];
    let signer_seeds = &[&authority_seeds[..]];

    transfer_checked(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            TransferChecked {
                from: treasury_account.to_account_info(),
                mint: token_mint.to_account_info(),
                to: recipient_account.to_account_info(),
                authority: program_authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        token_mint.decimals,
    )?;

    Ok(())
}

fn execute_parameter_update<'info>(
    governance_config: &mut Account<'info, GovernanceConfig>,
    execution_data: &[u8],
) -> Result<()> {
    require!(execution_data.len() >= 9, ErrorCode::InvalidExecutionData);

    let parameter_id = execution_data[0];
    let value_bytes: [u8; 8] = execution_data[1..9]
        .try_into()
        .map_err(|_| ErrorCode::InvalidExecutionData)?;
    let new_value = u64::from_le_bytes(value_bytes);

    let clock = Clock::get()?;

    match parameter_id {
        0 => {
            require!(
                new_value >= 1 && new_value <= 100,
                ErrorCode::InvalidParameterValue
            );
            msg!(
                "Updating quorum: {} -> {}",
                governance_config.quorum_percentage,
                new_value
            );
            governance_config.quorum_percentage = new_value;
        }
        1 => {
            require!(
                new_value >= 51 && new_value <= 100,
                ErrorCode::InvalidParameterValue
            );
            msg!(
                "Updating threshold: {} -> {}",
                governance_config.passing_threshold,
                new_value
            );
            governance_config.passing_threshold = new_value;
        }
        2 => {
            require!(new_value <= 30 * 86400, ErrorCode::InvalidParameterValue);
            msg!(
                "Updating timelock: {} -> {} seconds",
                governance_config.timelock_duration,
                new_value
            );
            governance_config.timelock_duration = new_value as i64;
        }
        _ => {
            return Err(ErrorCode::InvalidParameterId.into());
        }
    }

    governance_config.last_updated = clock.unix_timestamp;

    Ok(())
}

fn calculate_hybrid_voting_power(stake_amount: u64, stake_duration_days: u32) -> u64 {
    let tokens = stake_amount / 1_000_000;

    let base_power = if tokens <= 100_000 {
        tokens
    } else {
        100_000 + ((tokens - 100_000) as f64).sqrt() as u64
    };

    let time_multiplier = match stake_duration_days {
        0..=30 => 100,
        31..=90 => 120,
        91..=365 => 150,
        _ => 200,
    };

    (base_power * time_multiplier) / 100
}

fn transfer_deposit_to_proposer<'info>(
    deposit_escrow: &InterfaceAccount<'info, TokenAccount>,
    proposer_token_account: &InterfaceAccount<'info, TokenAccount>,
    token_mint: &InterfaceAccount<'info, Mint>,
    program_authority: &UncheckedAccount<'info>,
    token_program: &Interface<'info, TokenInterface>,
    amount: u64,
    authority_bump: u8,
) -> Result<()> {
    let authority_bump_arr = &[authority_bump];
    let authority_seeds = &[PROGRAM_AUTHORITY_SEED.as_ref(), authority_bump_arr.as_ref()];
    let signer_seeds = &[&authority_seeds[..]];

    transfer_checked(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            TransferChecked {
                from: deposit_escrow.to_account_info(),
                mint: token_mint.to_account_info(),
                to: proposer_token_account.to_account_info(),
                authority: program_authority.to_account_info(),
            },
            signer_seeds,
        ),
        amount,
        token_mint.decimals,
    )?;

    Ok(())
}

#[account]
pub struct StakingPool {
    pub authority: Pubkey,
    pub authority_bump: u8,
    pub initializer: Pubkey,
    pub total_staked_amount: u64,
    pub mint_address: Pubkey,
    pub escrow_account: Pubkey,
    pub bump: u8,
    pub created_at: i64,
    pub is_active: bool,
    pub token_price_usd_micro: u64,
    pub price_last_updated: i64,
}

#[account]
pub struct UserStakingAccount {
    pub staker: Pubkey,
    pub staked_amount: u64,
    pub timestamp: i64,
    pub last_updated: i64,
    pub bump: u8,
}

#[account]
pub struct GovernanceAccount {
    pub staker: Pubkey,
    pub participation_count: u32,
    pub last_vote_timestamp: i64,
    pub stake_lock_end: i64,
    pub voting_power_cache: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct ProposalAccount {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub title: String,
    pub description: String,
    pub proposal_type: ProposalType,
    pub status: ProposalStatus,
    pub execution_data: Vec<u8>,
    pub voting_period_days: u8,
    pub created_at: i64,
    pub voting_ends_at: i64,
    pub finalized_at: i64,
    pub executed_at: i64,
    pub timelock_end: i64,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub abstain_votes: u64,
    pub total_voters: u32,
    pub deposit_amount: u64,
    pub deposit_refunded: bool,
    pub bump: u8,
    pub reserved: [u8; 32],
}

#[account]
pub struct VoteRecord {
    pub voter: Pubkey,
    pub proposal_id: u64,
    pub vote_choice: VoteChoice,
    pub voting_power: u64,
    pub voted_at: i64,
    pub bump: u8,
}

#[account]
pub struct GovernanceConfig {
    pub authority: Pubkey,
    pub quorum_percentage: u64,
    pub passing_threshold: u64,
    pub timelock_duration: i64,
    pub min_stake_to_propose: u64,
    pub proposal_deposit: u64,
    pub created_at: i64,
    pub last_updated: i64,
    pub bump: u8,
    pub reserved: [u8; 32],
}

// ============================================================================
// ACCOUNT CONTEXTS
// ============================================================================

#[derive(Accounts)]
pub struct InitializeStakingPool<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = 8 + 163,
        seeds = [STAKING_POOL_SEED],
        bump
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump)]
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

    #[account(constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram)]
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
        space = 8 + 57,
        seeds = [USER_STAKE_SEED, staker.key().as_ref()],
        bump,
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = staking_pool.authority_bump)]
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

    #[account(constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram)]
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

    #[account(seeds = [GOVERNANCE_SEED, staker.key().as_ref()], bump = governance_account.bump)]
    pub governance_account: Option<Account<'info, GovernanceAccount>>,

    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = staking_pool.authority_bump)]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(mut, seeds = [STAKING_POOL_ESCROW_SEED, staking_pool.key().as_ref()], bump)]
    pub escrow_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = token_mint,
        associated_token::authority = staker,
        associated_token::token_program = token_program
    )]
    pub staker_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct InitializeGovernanceAccount<'info> {
    #[account(mut)]
    pub staker: Signer<'info>,

    #[account(init, payer = staker, space = 8 + 69, seeds = [GOVERNANCE_SEED, staker.key().as_ref()], bump)]
    pub governance_account: Account<'info, GovernanceAccount>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitializeGovernanceConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + 121,
        seeds = [GOVERNANCE_CONFIG_SEED],
        bump
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

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

    #[account(mut, seeds = [GOVERNANCE_SEED, staker.key().as_ref()], bump = governance_account.bump)]
    pub governance_account: Account<'info, GovernanceAccount>,
}

#[derive(Accounts)]
pub struct InitializeProposalEscrow<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(seeds = [STAKING_POOL_SEED], bump = staking_pool.bump)]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = staking_pool.authority_bump)]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        token::mint = token_mint,
        token::authority = program_authority,
        seeds = [PROPOSAL_ESCROW_SEED],
        bump
    )]
    pub proposal_escrow: InterfaceAccount<'info, TokenAccount>,

    #[account(constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u64)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,

    #[account(
        seeds = [USER_STAKE_SEED, proposer.key().as_ref()],
        bump = proposer_staking_account.bump,
        constraint = proposer_staking_account.staker == proposer.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub proposer_staking_account: Account<'info, UserStakingAccount>,

    #[account(
        seeds = [GOVERNANCE_SEED, proposer.key().as_ref()],
        bump = proposer_governance_account.bump,
        constraint = proposer_governance_account.staker == proposer.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub proposer_governance_account: Account<'info, GovernanceAccount>,

    #[account(init, payer = proposer, space = 8 + 2700, seeds = [PROPOSAL_SEED, proposal_id.to_le_bytes().as_ref()], bump)]
    pub proposal_account: Account<'info, ProposalAccount>,

    #[account(seeds = [STAKING_POOL_SEED], bump = staking_pool.bump)]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = staking_pool.authority_bump)]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        associated_token::mint = deposit_token_mint,
        associated_token::authority = proposer,
        associated_token::token_program = token_program,
    )]
    pub proposer_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, seeds = [PROPOSAL_ESCROW_SEED], bump)]
    pub deposit_escrow_account: InterfaceAccount<'info, TokenAccount>,

    #[account(constraint = deposit_token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram)]
    pub deposit_token_mint: InterfaceAccount<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(vote_choice: VoteChoice)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,

    #[account(
        seeds = [USER_STAKE_SEED, voter.key().as_ref()],
        bump = user_staking_account.bump,
        constraint = user_staking_account.staker == voter.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    #[account(
        mut,
        seeds = [GOVERNANCE_SEED, voter.key().as_ref()],
        bump = governance_account.bump,
        constraint = governance_account.staker == voter.key() @ ErrorCode::UnauthorizedStaker,
    )]
    pub governance_account: Account<'info, GovernanceAccount>,

    #[account(mut, seeds = [PROPOSAL_SEED, proposal_account.proposal_id.to_le_bytes().as_ref()], bump = proposal_account.bump)]
    pub proposal_account: Account<'info, ProposalAccount>,

    #[account(
        init,
        payer = voter,
        space = 8 + 82,
        seeds = [VOTE_SEED, proposal_account.proposal_id.to_le_bytes().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote_record: Account<'info, VoteRecord>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct FinalizeProposal<'info> {
    #[account(mut)]
    pub finalizer: Signer<'info>,

    #[account(mut, seeds = [PROPOSAL_SEED, proposal_account.proposal_id.to_le_bytes().as_ref()], bump = proposal_account.bump)]
    pub proposal_account: Account<'info, ProposalAccount>,

    #[account(seeds = [STAKING_POOL_SEED], bump = staking_pool.bump)]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = staking_pool.authority_bump)]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(mut, seeds = [PROPOSAL_ESCROW_SEED], bump)]
    pub deposit_escrow_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, constraint = proposer_token_account.owner == proposal_account.proposer @ ErrorCode::InvalidProposerAccount)]
    pub proposer_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(constraint = token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram)]
    pub token_mint: InterfaceAccount<'info, Mint>,

    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    #[account(mut)]
    pub executor: Signer<'info>,

    #[account(mut, seeds = [PROPOSAL_SEED, proposal_account.proposal_id.to_le_bytes().as_ref()], bump = proposal_account.bump)]
    pub proposal_account: Account<'info, ProposalAccount>,

    #[account(seeds = [STAKING_POOL_SEED], bump = staking_pool.bump)]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(seeds = [PROGRAM_AUTHORITY_SEED], bump = staking_pool.authority_bump)]
    /// CHECK: Program authority PDA
    pub program_authority: UncheckedAccount<'info>,

    #[account(mut, seeds = [PROPOSAL_ESCROW_SEED], bump)]
    pub deposit_escrow_account: InterfaceAccount<'info, TokenAccount>,

    #[account(mut, constraint = proposer_token_account.owner == proposal_account.proposer @ ErrorCode::InvalidProposerAccount)]
    pub proposer_token_account: InterfaceAccount<'info, TokenAccount>,

    #[account(constraint = deposit_token_mint.to_account_info().owner == &spl_token_2022::ID @ ErrorCode::InvalidTokenProgram)]
    pub deposit_token_mint: InterfaceAccount<'info, Mint>,

    pub token_program_for_deposit: Interface<'info, TokenInterface>,

    #[account(mut)]
    pub treasury_account: Option<InterfaceAccount<'info, TokenAccount>>,

    #[account(mut)]
    pub recipient_account: Option<InterfaceAccount<'info, TokenAccount>>,

    pub token_mint: Option<InterfaceAccount<'info, Mint>>,

    pub token_program: Option<Interface<'info, TokenInterface>>,

    #[account(
        mut,
        seeds = [GOVERNANCE_CONFIG_SEED],
        bump = governance_config.bump,
    )]
    pub governance_config: Option<Account<'info, GovernanceConfig>>,
}

// ============================================================================
// ERROR CODES
// ============================================================================

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
    #[msg(
        "Insufficient stake amount to create proposal - minimum 10,000 ZSNIPE tokens must be staked"
    )]
    InsufficientStakeToPropose,
    #[msg("Insufficient stake duration to create proposal - minimum 30 days required")]
    InsufficientStakeDurationToPropose,
    #[msg("Insufficient deposit - 1000 ZSNIPE tokens required to create a proposal")]
    InsufficientDepositToPropose,
    #[msg("Maximum Active proposals reached - You have 3 active proposals already")]
    MaxActiveProposalsReached,
    #[msg("Proposal title too long - Max 100 Characters")]
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
    #[msg("Voting period has not ended yet")]
    VotingPeriodNotEnded,
    #[msg("Proposal has already been finalized")]
    ProposalAlreadyFinalized,
    #[msg("Invalid proposer token account")]
    InvalidProposerAccount,
    #[msg("Proposal has not passed - cannot execute")]
    ProposalNotPassed,
    #[msg("Timelock period has not expired yet")]
    TimelockNotExpired,
    #[msg("Proposal has already been executed")]
    ProposalAlreadyExecuted,
    #[msg("Invalid execution data format")]
    InvalidExecutionData,
    #[msg("Missing treasury account for treasury transfer")]
    MissingTreasuryAccount,
    #[msg("Missing recipient account for treasury transfer")]
    MissingRecipientAccount,
    #[msg("Missing token mint for treasury transfer")]
    MissingTokenMint,
    #[msg("Missing token program for treasury transfer")]
    MissingTokenProgram,
    #[msg("Missing governance config for parameter update")]
    MissingGovernanceConfig,
    #[msg("Insufficient treasury balance for transfer")]
    InsufficientTreasuryBalance,
    #[msg("Invalid parameter ID")]
    InvalidParameterId,
    #[msg("Invalid parameter value - out of acceptable range")]
    InvalidParameterValue,
    #[msg("Governance config not initialized yet")]
    GovernanceConfigNotInitialized,
    #[msg("Invalid governance config")]
    InvalidGovernanceConfig,
}
