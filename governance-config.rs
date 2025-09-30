use anchor_lang::prelude::*;
use solana_program::pubkey;

declare_id!("26YfmsTQJhpcbUSDP9U3nkrVFFqFfr8zb8XC1pHxuDyC");

// Reference to your existing staking contract
pub const STAKING_CONTRACT_ID: Pubkey = pubkey!("629dBzrHwL12uJS1nN8VyomiWgRTtVWqdmSUJLcpxjyu");

#[program]
pub mod governance_config {
    use super::*;

    pub fn initialize_governance_config(ctx: Context<InitializeGovernanceConfig>) -> Result<()> {
        let governance_config = &mut ctx.accounts.governance_config;
        let clock = Clock::get()?;

        // Validate that staking pool is from the correct program
        require!(
            ctx.accounts.staking_pool.to_account_info().owner == &STAKING_CONTRACT_ID,
            GovernanceConfigError::InvalidStakingContract
        );

        governance_config.authority = ctx.accounts.authority.key();
        governance_config.staking_pool = ctx.accounts.staking_pool.key();
        governance_config.staking_contract = STAKING_CONTRACT_ID;
        governance_config.version = 1;
        governance_config.created_at = clock.unix_timestamp;
        governance_config.last_updated = clock.unix_timestamp;
        governance_config.bump = ctx.bumps.governance_config;

        // Initialize with secure defaults
        governance_config.parameter_bounds = ParameterBounds::default();
        governance_config.time_multipliers = TimeMultipliers::default();
        governance_config.proposal_settings = ProposalSettings::default();
        governance_config.execution_settings = ExecutionSettings::default();
        governance_config.emergency_settings = EmergencySettings::default();

        emit!(GovernanceConfigInitialized {
            authority: ctx.accounts.authority.key(),
            staking_pool: ctx.accounts.staking_pool.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn update_governance_parameter(
        ctx: Context<UpdateGovernanceParameter>,
        update_type: ParameterUpdateType,
    ) -> Result<()> {
        let governance_config = &mut ctx.accounts.governance_config;
        let clock = Clock::get()?;

        // Validate authority (allow both admin and governance voting)
        let is_admin = governance_config.authority == ctx.accounts.authority.key();
        let is_governance = ctx.accounts.governance_proposal.is_some();

        require!(
            is_admin || is_governance,
            GovernanceConfigError::Unauthorized
        );

        // If governance proposal, validate it's approved and executable
        if let Some(proposal) = &ctx.accounts.governance_proposal {
            require!(
                proposal.status == ProposalStatus::Approved,
                GovernanceConfigError::ProposalNotApproved
            );
            require!(
                proposal.proposal_type == ProposalType::ParameterUpdate,
                GovernanceConfigError::InvalidProposalType
            );
        }

        match update_type {
            ParameterUpdateType::TimeMultiplier { tier, multiplier } => {
                require!(
                    tier <= 3 && multiplier >= 100 && multiplier <= 500,
                    GovernanceConfigError::InvalidParameterValue
                );

                let old_value = match tier {
                    1 => governance_config.time_multipliers.tier_1_multiplier,
                    2 => governance_config.time_multipliers.tier_2_multiplier,
                    3 => governance_config.time_multipliers.tier_3_multiplier,
                    _ => return Err(GovernanceConfigError::InvalidParameterValue.into()),
                };

                match tier {
                    1 => governance_config.time_multipliers.tier_1_multiplier = multiplier,
                    2 => governance_config.time_multipliers.tier_2_multiplier = multiplier,
                    3 => governance_config.time_multipliers.tier_3_multiplier = multiplier,
                    _ => return Err(GovernanceConfigError::InvalidParameterValue.into()),
                }

                emit!(ParameterUpdated {
                    parameter_type: "time_multiplier".to_string(),
                    old_value: old_value as u64,
                    new_value: multiplier as u64,
                    updated_by: ctx.accounts.authority.key(),
                    timestamp: clock.unix_timestamp,
                });
            }
            ParameterUpdateType::ProposalStake { amount } => {
                require!(
                    amount >= governance_config.parameter_bounds.min_proposal_stake_base
                        && amount <= governance_config.parameter_bounds.max_proposal_stake_base,
                    GovernanceConfigError::InvalidParameterValue
                );
                let old_stake = governance_config.proposal_settings.base_proposal_stake;
                governance_config.proposal_settings.base_proposal_stake = amount;

                emit!(ParameterUpdated {
                    parameter_type: "proposal_stake".to_string(),
                    old_value: old_stake,
                    new_value: amount,
                    updated_by: ctx.accounts.authority.key(),
                    timestamp: clock.unix_timestamp,
                });
            }
            ParameterUpdateType::QuorumThreshold { percentage } => {
                require!(
                    percentage >= governance_config.parameter_bounds.min_quorum_percentage
                        && percentage <= governance_config.parameter_bounds.max_quorum_percentage,
                    GovernanceConfigError::InvalidParameterValue
                );
                let old_quorum = governance_config
                    .proposal_settings
                    .default_quorum_percentage;
                governance_config
                    .proposal_settings
                    .default_quorum_percentage = percentage;

                emit!(ParameterUpdated {
                    parameter_type: "quorum_threshold".to_string(),
                    old_value: old_quorum as u64,
                    new_value: percentage as u64,
                    updated_by: ctx.accounts.authority.key(),
                    timestamp: clock.unix_timestamp,
                });
            }
            ParameterUpdateType::VotingPeriod { hours } => {
                require!(
                    hours >= governance_config.parameter_bounds.min_voting_period_hours
                        && hours <= governance_config.parameter_bounds.max_voting_period_hours,
                    GovernanceConfigError::InvalidParameterValue
                );
                let old_period = governance_config
                    .proposal_settings
                    .default_voting_period_hours;
                governance_config
                    .proposal_settings
                    .default_voting_period_hours = hours;

                emit!(ParameterUpdated {
                    parameter_type: "voting_period".to_string(),
                    old_value: old_period as u64,
                    new_value: hours as u64,
                    updated_by: ctx.accounts.authority.key(),
                    timestamp: clock.unix_timestamp,
                });
            }
            ParameterUpdateType::EmergencySettings {
                quorum_reduction,
                voting_period,
            } => {
                governance_config
                    .emergency_settings
                    .emergency_quorum_reduction = quorum_reduction;
                governance_config
                    .emergency_settings
                    .emergency_voting_period_hours = voting_period;

                emit!(EmergencySettingsUpdated {
                    quorum_reduction,
                    voting_period,
                    updated_by: ctx.accounts.authority.key(),
                    timestamp: clock.unix_timestamp,
                });
            }
            ParameterUpdateType::TreasuryLimit { percentage } => {
                require!(
                    percentage <= governance_config
                        .parameter_bounds
                        .max_treasury_withdrawal_percentage,
                    GovernanceConfigError::InvalidParameterValue
                );
                // Store treasury limit in parameter bounds
                governance_config
                    .parameter_bounds
                    .max_treasury_withdrawal_percentage = percentage;

                emit!(ParameterUpdated {
                    parameter_type: "treasury_limit".to_string(),
                    old_value: governance_config
                        .parameter_bounds
                        .max_treasury_withdrawal_percentage as u64,
                    new_value: percentage as u64,
                    updated_by: ctx.accounts.authority.key(),
                    timestamp: clock.unix_timestamp,
                });
            }
            ParameterUpdateType::ExecutionDelay { hours } => {
                require!(
                    hours >= governance_config.parameter_bounds.min_execution_delay_hours
                        && hours <= governance_config.parameter_bounds.max_execution_delay_hours,
                    GovernanceConfigError::InvalidParameterValue
                );
                let old_delay = governance_config
                    .execution_settings
                    .execution_grace_period_hours;
                governance_config
                    .execution_settings
                    .execution_grace_period_hours = hours;

                emit!(ParameterUpdated {
                    parameter_type: "execution_delay".to_string(),
                    old_value: old_delay as u64,
                    new_value: hours as u64,
                    updated_by: ctx.accounts.authority.key(),
                    timestamp: clock.unix_timestamp,
                });
            }
        }

        governance_config.last_updated = clock.unix_timestamp;
        Ok(())
    }

    pub fn get_voting_power_with_config(ctx: Context<GetVotingPowerWithConfig>) -> Result<u64> {
        let governance_config = &ctx.accounts.governance_config;
        let user_staking_account = &ctx.accounts.user_staking_account;
        let clock = Clock::get()?;

        // Calculate stake duration
        let stake_duration_seconds = clock.unix_timestamp - user_staking_account.timestamp;
        let stake_duration_days = (stake_duration_seconds / 86400) as u32;

        // Use configurable parameters instead of hardcoded values
        let voting_power = calculate_configurable_voting_power(
            user_staking_account.staked_amount,
            stake_duration_days,
            &governance_config.time_multipliers,
        );

        emit!(VotingPowerCalculated {
            user: ctx.accounts.user.key(),
            voting_power,
            stake_amount: user_staking_account.staked_amount,
            stake_duration_days,
            timestamp: clock.unix_timestamp,
        });

        Ok(voting_power)
    }

    pub fn validate_proposal_requirements(
        ctx: Context<ValidateProposalRequirements>,
        proposer_history: u32,
    ) -> Result<ProposalValidationResult> {
        let governance_config = &ctx.accounts.governance_config;
        let user_staking_account = &ctx.accounts.user_staking_account;

        // Calculate required stake with escalation
        let required_stake =
            governance_config.calculate_proposal_stake_requirement(proposer_history)?;

        // Check if user has enough staked
        let has_sufficient_stake = user_staking_account.staked_amount >= required_stake;

        // Check stake duration requirement
        let clock = Clock::get()?;
        let stake_duration_days =
            ((clock.unix_timestamp - user_staking_account.timestamp) / 86400) as u32;
        let meets_duration_requirement =
            stake_duration_days >= governance_config.parameter_bounds.min_stake_duration_days;

        let result = ProposalValidationResult {
            required_stake,
            has_sufficient_stake,
            meets_duration_requirement,
            can_propose: has_sufficient_stake && meets_duration_requirement,
        };

        emit!(ProposalValidationPerformed {
            user: ctx.accounts.user.key(),
            required_stake,
            has_sufficient_stake,
            meets_duration_requirement,
            timestamp: clock.unix_timestamp,
        });

        Ok(result)
    }

    pub fn toggle_emergency_mode(ctx: Context<ToggleEmergencyMode>, enabled: bool) -> Result<()> {
        let governance_config = &mut ctx.accounts.governance_config;

        require!(
            governance_config.authority == ctx.accounts.authority.key()
                || governance_config.emergency_settings.emergency_multisig
                    == ctx.accounts.authority.key(),
            GovernanceConfigError::EmergencyNotAuthorized
        );

        governance_config
            .emergency_settings
            .emergency_override_enabled = enabled;
        governance_config.last_updated = Clock::get()?.unix_timestamp;

        emit!(EmergencyModeToggled {
            enabled,
            triggered_by: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn batch_update_parameters(
        ctx: Context<UpdateGovernanceParameter>,
        updates: Vec<ParameterUpdateType>,
    ) -> Result<()> {
        require!(
            updates.len() <= 10,
            GovernanceConfigError::TooManyBatchUpdates
        );

        for update in updates {
            // Apply each update individually
            let governance_config = &mut ctx.accounts.governance_config;
            let clock = Clock::get()?;

            // Validate bounds for each update
            governance_config.validate_parameter_bounds(&update)?;

            // Apply the specific update (simplified version for batch)
            match update {
                ParameterUpdateType::TimeMultiplier { tier, multiplier } => match tier {
                    1 => governance_config.time_multipliers.tier_1_multiplier = multiplier,
                    2 => governance_config.time_multipliers.tier_2_multiplier = multiplier,
                    3 => governance_config.time_multipliers.tier_3_multiplier = multiplier,
                    _ => return Err(GovernanceConfigError::InvalidParameterValue.into()),
                },
                ParameterUpdateType::ProposalStake { amount } => {
                    governance_config.proposal_settings.base_proposal_stake = amount;
                }
                // Add other parameter types as needed
                _ => {} // Handle other types
            }

            governance_config.last_updated = clock.unix_timestamp;
        }

        Ok(())
    }
}

// Calculate voting power using configurable parameters
fn calculate_configurable_voting_power(
    stake_amount: u64,
    stake_duration_days: u32,
    time_multipliers: &TimeMultipliers,
) -> u64 {
    // Same base calculation as your original
    let base_power = if stake_amount <= 100_000 {
        stake_amount
    } else {
        100_000 + ((stake_amount - 100_000) as f64).sqrt() as u64
    };

    // Use configurable time multipliers
    let time_multiplier = if stake_duration_days >= time_multipliers.tier_2_days {
        time_multipliers.tier_3_multiplier
    } else if stake_duration_days >= time_multipliers.tier_1_days {
        time_multipliers.tier_2_multiplier
    } else {
        time_multipliers.tier_1_multiplier
    };

    (base_power * time_multiplier as u64) / 100
}

// === ACCOUNT STRUCTURES ===

#[account]
pub struct GovernanceConfig {
    pub authority: Pubkey,                     // 32 bytes
    pub staking_pool: Pubkey,                  // 32 bytes
    pub staking_contract: Pubkey,              // 32 bytes
    pub parameter_bounds: ParameterBounds,     // 120 bytes
    pub time_multipliers: TimeMultipliers,     // 16 bytes
    pub proposal_settings: ProposalSettings,   // 64 bytes
    pub execution_settings: ExecutionSettings, // 32 bytes
    pub emergency_settings: EmergencySettings, // 44 bytes
    pub version: u8,                           // 1 byte
    pub created_at: i64,                       // 8 bytes
    pub last_updated: i64,                     // 8 bytes
    pub bump: u8,                              // 1 byte
}
// Total: 390 bytes

// External account types (from your staking contract)
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

#[account]
pub struct UserStakingAccount {
    pub staker: Pubkey,     // 32 bytes
    pub staked_amount: u64, // 8 bytes
    pub timestamp: i64,     // 8 bytes
    pub last_updated: i64,  // 8 bytes
    pub bump: u8,           // 1 byte
}

#[account]
pub struct GovernanceProposal {
    pub id: u64,                     // 8 bytes
    pub proposer: Pubkey,            // 32 bytes
    pub proposal_type: ProposalType, // 1 byte
    pub status: ProposalStatus,      // 1 byte
    pub votes_for: u64,              // 8 bytes
    pub votes_against: u64,          // 8 bytes
    pub created_at: i64,             // 8 bytes
    pub voting_ends_at: i64,         // 8 bytes
    pub executed_at: i64,            // 8 bytes
    pub bump: u8,                    // 1 byte
}

// Config-specific types
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ParameterBounds {
    pub min_quorum_percentage: u16,              // 2 bytes
    pub max_quorum_percentage: u16,              // 2 bytes
    pub min_proposal_stake_base: u64,            // 8 bytes
    pub max_proposal_stake_base: u64,            // 8 bytes
    pub min_voting_period_hours: u32,            // 4 bytes
    pub max_voting_period_hours: u32,            // 4 bytes
    pub min_execution_delay_hours: u32,          // 4 bytes
    pub max_execution_delay_hours: u32,          // 4 bytes
    pub min_stake_duration_days: u32,            // 4 bytes
    pub max_treasury_withdrawal_percentage: u16, // 2 bytes
    pub spam_prevention_cooldown_hours: u32,     // 4 bytes
    pub reserved: [u8; 74],                      // 74 bytes
}
// Total: 120 bytes

impl Default for ParameterBounds {
    fn default() -> Self {
        Self {
            min_quorum_percentage: 1000, // 10%
            max_quorum_percentage: 7000, // 70%
            min_proposal_stake_base: 1000 * 10_u64.pow(6),
            max_proposal_stake_base: 100000 * 10_u64.pow(6),
            min_voting_period_hours: 24,
            max_voting_period_hours: 168,
            min_execution_delay_hours: 6,
            max_execution_delay_hours: 72,
            min_stake_duration_days: 1,
            max_treasury_withdrawal_percentage: 1000, // 10%
            spam_prevention_cooldown_hours: 24,
            reserved: [0; 74],
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TimeMultipliers {
    pub tier_1_days: u32,       // 4 bytes
    pub tier_1_multiplier: u16, // 2 bytes
    pub tier_2_days: u32,       // 4 bytes
    pub tier_2_multiplier: u16, // 2 bytes
    pub tier_3_multiplier: u16, // 2 bytes
    pub reserved: u16,          // 2 bytes
}
// Total: 16 bytes

impl Default for TimeMultipliers {
    fn default() -> Self {
        Self {
            tier_1_days: 30,
            tier_1_multiplier: 120, // 1.2x
            tier_2_days: 90,
            tier_2_multiplier: 150, // 1.5x
            tier_3_multiplier: 200, // 2.0x
            reserved: 0,
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProposalSettings {
    pub base_proposal_stake: u64,         // 8 bytes
    pub stake_escalation_factor: u16,     // 2 bytes
    pub max_escalation_multiplier: u16,   // 2 bytes
    pub default_quorum_percentage: u16,   // 2 bytes
    pub default_voting_period_hours: u32, // 4 bytes
    pub proposal_fee_percentage: u16,     // 2 bytes
    pub refund_threshold_percentage: u16, // 2 bytes
    pub max_concurrent_proposals: u8,     // 1 byte
    pub reserved: [u8; 41],               // 41 bytes
}
// Total: 64 bytes

impl Default for ProposalSettings {
    fn default() -> Self {
        Self {
            base_proposal_stake: 5000 * 10_u64.pow(6),
            stake_escalation_factor: 150,
            max_escalation_multiplier: 500,
            default_quorum_percentage: 2000,   // 20%
            default_voting_period_hours: 72,   // 3 days
            proposal_fee_percentage: 100,      // 1%
            refund_threshold_percentage: 3000, // 30%
            max_concurrent_proposals: 3,
            reserved: [0; 41],
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ExecutionSettings {
    pub treasury_threshold_for_multisig: u64, // 8 bytes
    pub multisig_required_approvals: u8,      // 1 byte
    pub auto_execution_enabled: bool,         // 1 byte
    pub execution_grace_period_hours: u32,    // 4 bytes
    pub reserved: [u8; 18],                   // 18 bytes
}
// Total: 32 bytes

impl Default for ExecutionSettings {
    fn default() -> Self {
        Self {
            treasury_threshold_for_multisig: 100000 * 10_u64.pow(6),
            multisig_required_approvals: 3,
            auto_execution_enabled: true,
            execution_grace_period_hours: 48,
            reserved: [0; 18],
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct EmergencySettings {
    pub emergency_multisig: Pubkey,         // 32 bytes
    pub emergency_override_enabled: bool,   // 1 byte
    pub emergency_quorum_reduction: u16,    // 2 bytes
    pub emergency_voting_period_hours: u32, // 4 bytes
    pub emergency_cooldown_hours: u32,      // 4 bytes
    pub reserved: [u8; 1],                  // 1 byte
}
// Total: 44 bytes

impl Default for EmergencySettings {
    fn default() -> Self {
        Self {
            emergency_multisig: Pubkey::default(),
            emergency_override_enabled: false,
            emergency_quorum_reduction: 2000,  // 20% reduction
            emergency_voting_period_hours: 12, // 12 hours
            emergency_cooldown_hours: 168,     // 7 days
            reserved: [0; 1],
        }
    }
}

// Enhanced enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ParameterUpdateType {
    QuorumThreshold {
        percentage: u16,
    },
    ProposalStake {
        amount: u64,
    },
    TimeMultiplier {
        tier: u8,
        multiplier: u16,
    },
    VotingPeriod {
        hours: u32,
    },
    EmergencySettings {
        quorum_reduction: u16,
        voting_period: u32,
    },
    TreasuryLimit {
        percentage: u16,
    },
    ExecutionDelay {
        hours: u32,
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ProposalType {
    ParameterUpdate,
    TreasuryWithdrawal,
    Emergency,
    TextProposal,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum ProposalStatus {
    Active,
    Approved,
    Rejected,
    Executed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ProposalValidationResult {
    pub required_stake: u64,
    pub has_sufficient_stake: bool,
    pub meets_duration_requirement: bool,
    pub can_propose: bool,
}

// === EVENTS ===

#[event]
pub struct GovernanceConfigInitialized {
    pub authority: Pubkey,
    pub staking_pool: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ParameterUpdated {
    pub parameter_type: String,
    pub old_value: u64,
    pub new_value: u64,
    pub updated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct EmergencySettingsUpdated {
    pub quorum_reduction: u16,
    pub voting_period: u32,
    pub updated_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VotingPowerCalculated {
    pub user: Pubkey,
    pub voting_power: u64,
    pub stake_amount: u64,
    pub stake_duration_days: u32,
    pub timestamp: i64,
}

#[event]
pub struct ProposalValidationPerformed {
    pub user: Pubkey,
    pub required_stake: u64,
    pub has_sufficient_stake: bool,
    pub meets_duration_requirement: bool,
    pub timestamp: i64,
}

#[event]
pub struct EmergencyModeToggled {
    pub enabled: bool,
    pub triggered_by: Pubkey,
    pub timestamp: i64,
}

// === ACCOUNT CONTEXTS ===

#[derive(Accounts)]
pub struct InitializeGovernanceConfig<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK: Validated by owner check
    #[account(
        constraint = staking_pool.to_account_info().owner == &STAKING_CONTRACT_ID @ GovernanceConfigError::InvalidStakingContract
    )]
    pub staking_pool: Account<'info, StakingPool>,

    #[account(
        init,
        payer = authority,
        space = 8 + 390, // Correct account size
        seeds = [b"governance_config", staking_pool.key().as_ref()],
        bump
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateGovernanceParameter<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"governance_config", staking_pool.key().as_ref()],
        bump = governance_config.bump
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    /// CHECK: Validated by governance config
    pub staking_pool: Account<'info, StakingPool>,

    // Optional governance proposal for validation
    pub governance_proposal: Option<Account<'info, GovernanceProposal>>,
}

#[derive(Accounts)]
pub struct GetVotingPowerWithConfig<'info> {
    pub user: Signer<'info>,

    #[account(
        seeds = [b"governance_config", staking_pool.key().as_ref()],
        bump = governance_config.bump
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    /// CHECK: From staking contract
    #[account(
        constraint = user_staking_account.to_account_info().owner == &STAKING_CONTRACT_ID @ GovernanceConfigError::InvalidStakingContract
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    /// CHECK: From staking contract
    pub staking_pool: Account<'info, StakingPool>,
}

#[derive(Accounts)]
pub struct ValidateProposalRequirements<'info> {
    pub user: Signer<'info>,

    #[account(
        seeds = [b"governance_config", staking_pool.key().as_ref()],
        bump = governance_config.bump
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    /// CHECK: From staking contract
    #[account(
        constraint = user_staking_account.to_account_info().owner == &STAKING_CONTRACT_ID @ GovernanceConfigError::InvalidStakingContract,
        constraint = user_staking_account.staker == user.key() @ GovernanceConfigError::UnauthorizedStaker
    )]
    pub user_staking_account: Account<'info, UserStakingAccount>,

    /// CHECK: From staking contract
    pub staking_pool: Account<'info, StakingPool>,
}

#[derive(Accounts)]
pub struct ToggleEmergencyMode<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"governance_config", staking_pool.key().as_ref()],
        bump = governance_config.bump
    )]
    pub governance_config: Account<'info, GovernanceConfig>,

    /// CHECK: Reference only
    pub staking_pool: Account<'info, StakingPool>,
}

// Helper implementations
impl GovernanceConfig {
    pub fn calculate_proposal_stake_requirement(&self, proposer_history: u32) -> Result<u64> {
        let base_stake = self.proposal_settings.base_proposal_stake;
        let escalation_factor = self.proposal_settings.stake_escalation_factor;
        let max_multiplier = self.proposal_settings.max_escalation_multiplier;

        let escalation_multiplier = std::cmp::min(
            100 + (proposer_history as u16).saturating_mul(escalation_factor) / 100,
            max_multiplier,
        );

        let required_stake = base_stake.saturating_mul(escalation_multiplier as u64) / 100;

        require!(
            required_stake >= self.parameter_bounds.min_proposal_stake_base
                && required_stake <= self.parameter_bounds.max_proposal_stake_base,
            GovernanceConfigError::InvalidParameterValue
        );

        Ok(required_stake)
    }

    pub fn is_emergency_active(&self) -> bool {
        self.emergency_settings.emergency_override_enabled
    }

    pub fn get_effective_quorum(&self, base_quorum: u16) -> u16 {
        if self.is_emergency_active() {
            base_quorum.saturating_sub(self.emergency_settings.emergency_quorum_reduction)
        } else {
            base_quorum
        }
    }

    pub fn validate_parameter_bounds(&self, update_type: &ParameterUpdateType) -> Result<()> {
        match update_type {
            ParameterUpdateType::QuorumThreshold { percentage } => {
                require!(
                    *percentage >= self.parameter_bounds.min_quorum_percentage
                        && *percentage <= self.parameter_bounds.max_quorum_percentage,
                    GovernanceConfigError::InvalidParameterValue
                );
            }
            ParameterUpdateType::VotingPeriod { hours } => {
                require!(
                    *hours >= self.parameter_bounds.min_voting_period_hours
                        && *hours <= self.parameter_bounds.max_voting_period_hours,
                    GovernanceConfigError::InvalidParameterValue
                );
            }
            ParameterUpdateType::ProposalStake { amount } => {
                require!(
                    *amount >= self.parameter_bounds.min_proposal_stake_base
                        && *amount <= self.parameter_bounds.max_proposal_stake_base,
                    GovernanceConfigError::InvalidParameterValue
                );
            }
            ParameterUpdateType::TimeMultiplier { tier, multiplier } => {
                require!(
                    *tier <= 3 && *multiplier >= 100 && *multiplier <= 500,
                    GovernanceConfigError::InvalidParameterValue
                );
            }
            ParameterUpdateType::TreasuryLimit { percentage } => {
                require!(
                    *percentage <= self.parameter_bounds.max_treasury_withdrawal_percentage,
                    GovernanceConfigError::InvalidParameterValue
                );
            }
            ParameterUpdateType::ExecutionDelay { hours } => {
                require!(
                    *hours >= self.parameter_bounds.min_execution_delay_hours
                        && *hours <= self.parameter_bounds.max_execution_delay_hours,
                    GovernanceConfigError::InvalidParameterValue
                );
            }
            _ => {} // Handle other parameter types
        }
        Ok(())
    }
}

#[error_code]
pub enum GovernanceConfigError {
    #[msg("Invalid parameter value - outside allowed bounds")]
    InvalidParameterValue,

    #[msg("Unauthorized - only authority can perform this action")]
    Unauthorized,

    #[msg("Invalid staking contract - must reference correct program")]
    InvalidStakingContract,

    #[msg("Invalid proposal stake calculation")]
    InvalidProposalStake,

    #[msg("Unauthorized staker - account mismatch")]
    UnauthorizedStaker,

    #[msg("Proposal not approved for execution")]
    ProposalNotApproved,

    #[msg("Invalid proposal type for this operation")]
    InvalidProposalType,

    #[msg("Emergency override not authorized")]
    EmergencyNotAuthorized,

    #[msg("Too many batch updates - maximum 10 allowed")]
    TooManyBatchUpdates,

    #[msg("Parameter bounds validation failed")]
    ParameterBoundsValidationFailed,

    #[msg("Configuration version mismatch")]
    ConfigVersionMismatch,
}
