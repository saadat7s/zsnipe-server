# Module Structure Documentation

## Overview

The staking and governance system has been reorganized into separate modules for better maintainability and separation of concerns. Each module has its own service, controller, and route files.

## Module Structure

### 1. **Staking Module**
- **Service**: `stakingServices.ts`
- **Controller**: `stakingController.ts`
- **Routes**: `stakingRoutes.ts`

**Functions:**
- `initializeStakingPool()` - Initialize staking pool (Admin only)
- `stakeTokens()` - Stake tokens for a user
- `unstakeTokens()` - Unstake tokens for a user
- `getStakingPoolInfo()` - Get staking pool information
- `getUserStakingInfo()` - Get user staking information
- `checkUserTokenBalance()` - Check user token balance
- `bulkStakeTokens()` - Bulk stake tokens for multiple wallets
- `getAllWalletsStatus()` - Get status of all mock wallets

### 2. **Governance Module**
- **Service**: `governanceServices.ts`
- **Controller**: `governanceController.ts`
- **Routes**: `governanceRoutes.ts`

**Functions:**
- `initializeGovernanceAccount()` - Initialize governance account
- `calculateVotingPower()` - Calculate voting power for a user
- `calculateHybridVotingPower()` - Client-side voting power calculation
- `checkVotingEligibility()` - Check voting eligibility
- `getGovernanceAccountInfo()` - Get governance account information
- `getCompleteUserGovernanceData()` - Get complete user governance data
- `bulkInitGovernanceAccounts()` - Bulk initialize governance accounts
- `bulkCalculateVotingPower()` - Bulk calculate voting power

### 3. **Proposal Module**
- **Service**: `proposalServices.ts`
- **Controller**: `proposalController.ts`
- **Routes**: `proposalRoutes.ts`

**Functions:**
- `initializeProposalEscrow()` - Initialize proposal escrow (Admin only)
- `createProposal()` - Create a new proposal
- `getProposalInfo()` - Get proposal information
- `getAllProposals()` - Get all proposals
- `castVote()` - Cast a vote on a proposal
- `getVoteRecord()` - Get vote record for a proposal
- `bulkCastVote()` - Bulk cast votes for multiple wallets
- `finalizeProposal()` - Finalize a proposal
- `getProposalFinalizationStatus()` - Get proposal finalization status

### 4. **Treasury Module**
- **Service**: `treasuryServices.ts`
- **Controller**: `treasuryController.ts`
- **Routes**: `treasuryRoutes.ts`

**Functions:**
- `initializeTreasury()` - Initialize treasury account (Admin only)
- `fundTreasury()` - Fund treasury with tokens
- `getAdminTreasuryAccount()` - Get admin treasury account information
- `getTreasuryAccountInfo()` - Get treasury account information

### 5. **Execution Module**
- **Service**: `executionServices.ts`
- **Controller**: `executionController.ts`
- **Routes**: `executionRoutes.ts`

**Functions:**
- `executeProposal()` - Execute a proposal
- `getProposalExecutionStatus()` - Get proposal execution status
- `executeTextProposal()` - Execute a text proposal
- `executeTreasuryTransferProposal()` - Execute a treasury transfer proposal
- `executeParameterUpdateProposal()` - Execute a parameter update proposal
- `executeProposalSmart()` - Execute a proposal with smart type detection
- `getExecutionReadinessReport()` - Get execution readiness report
- `bulkExecuteReadyProposals()` - Bulk execute all ready proposals
- `getExecutionSchedule()` - Get execution schedule for all proposals
- `getProposalExecutionPreview()` - Get proposal execution preview

### 6. **Governance Config Module**
- **Service**: `governanceConfigServices.ts`
- **Controller**: `governanceConfigController.ts`
- **Routes**: `governanceConfigRoutes.ts`

**Functions:**
- `initializeGovernanceConfig()` - Initialize governance config (Admin only)

## Shared Dependencies

All modules share these common dependencies:
- `getPDAs.ts` - Program Derived Address helpers
- `getProgram.ts` - Anchor program initialization
- `mockWallets.ts` - Mock wallet helpers
- `constants.ts` - Governance constants
- `helpers.ts` - Utility helper functions

## API Endpoints

### Staking Endpoints
- `POST /api/staking/init-pool` - Initialize staking pool
- `POST /api/staking/stake` - Stake tokens
- `POST /api/staking/unstake` - Unstake tokens
- `GET /api/staking/pool-info` - Get staking pool info
- `GET /api/staking/user-info` - Get user staking info
- `GET /api/staking/token-balance` - Check token balance
- `POST /api/staking/bulk-stake` - Bulk stake tokens
- `GET /api/staking/all-wallets-status` - Get all wallets status

### Governance Endpoints
- `POST /api/governance/init-account` - Initialize governance account
- `POST /api/governance/calculate-voting-power` - Calculate voting power
- `POST /api/governance/calculate-hybrid-voting-power` - Calculate hybrid voting power
- `GET /api/governance/check-eligibility` - Check voting eligibility
- `GET /api/governance/account-info` - Get governance account info
- `GET /api/governance/complete-data` - Get complete governance data
- `POST /api/governance/bulk-init-accounts` - Bulk initialize governance accounts
- `POST /api/governance/bulk-calculate-voting-power` - Bulk calculate voting power

### Proposal Endpoints
- `POST /api/proposals/init-escrow` - Initialize proposal escrow
- `POST /api/proposals/create` - Create proposal
- `GET /api/proposals/:proposalId` - Get proposal info
- `GET /api/proposals` - Get all proposals
- `POST /api/proposals/vote` - Cast vote
- `GET /api/proposals/:proposalId/vote-record` - Get vote record
- `POST /api/proposals/bulk-vote` - Bulk cast votes
- `POST /api/proposals/finalize` - Finalize proposal
- `GET /api/proposals/:proposalId/finalization-status` - Get finalization status

### Treasury Endpoints
- `POST /api/treasury/init` - Initialize treasury
- `POST /api/treasury/fund` - Fund treasury
- `GET /api/treasury/admin-account` - Get admin treasury account
- `GET /api/treasury/account-info` - Get treasury account info

### Execution Endpoints
- `POST /api/execution/execute` - Execute proposal
- `GET /api/execution/:proposalId/status` - Get execution status
- `POST /api/execution/execute/text` - Execute text proposal
- `POST /api/execution/execute/treasury` - Execute treasury transfer proposal
- `POST /api/execution/execute/parameter` - Execute parameter update proposal
- `POST /api/execution/execute/smart` - Execute proposal smart
- `GET /api/execution/:proposalId/readiness-report` - Get readiness report
- `POST /api/execution/bulk-execute` - Bulk execute ready proposals
- `GET /api/execution/schedule` - Get execution schedule
- `GET /api/execution/:proposalId/preview` - Get execution preview

### Governance Config Endpoints
- `POST /api/governance-config/init` - Initialize governance config

## Integration Steps

1. **Update main app.ts** to import and use the new route modules
2. **Remove old services.ts** and related files
3. **Update any existing imports** to use the new modular structure
4. **Test all endpoints** to ensure functionality is preserved

## Benefits

- **Better Organization**: Each module is self-contained with its own concerns
- **Easier Maintenance**: Changes to one module don't affect others
- **Clearer API Structure**: Endpoints are logically grouped by functionality
- **Improved Scalability**: New modules can be added without affecting existing ones
- **Better Testing**: Each module can be tested independently
