import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
  } from "@solana/web3.js";
  
  import * as anchor from "@coral-xyz/anchor";
  import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { UserStakingAccount } from "../types";
  
  // Import existing utilities
  import { 
    getProgram, 
    getMockWalletKeypair, 
    getAllMockWallets,
    getStakingPoolPda,
    getUserStakePda 
  } from "../staking/services";
  
  // Governance Config Program constants
  const GOVERNANCE_CONFIG_PROGRAM_ID = new PublicKey("26YfmsTQJhpcbUSDP9U3nkrVFFqFfr8zb8XC1pHxuDyC");
  const GOVERNANCE_CONFIG_SEED = "governance_config";
  
  // Helper function to get governance config program
  export const getGovernanceConfigProgram = () => {
    const idl = require("./idl-governance-config.json"); // You'll need to generate this
    const walletKeypair = require("../staking/ZSNIPE_Admin-wallet-keypair.json");
  
    const adminKeypair = Keypair.fromSecretKey(new Uint8Array(walletKeypair));
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  
    const provider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(adminKeypair),
      anchor.AnchorProvider.defaultOptions()
    );
  
    return {
      program: new anchor.Program(idl, GOVERNANCE_CONFIG_PROGRAM_ID, provider),
      adminPublicKey: adminKeypair.publicKey,
      adminKeypair,
      connection,
    };
  };
  
  // Helper function to get governance config PDA
  export function getGovernanceConfigPda(stakingPoolPda: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(GOVERNANCE_CONFIG_SEED), stakingPoolPda.toBuffer()],
      GOVERNANCE_CONFIG_PROGRAM_ID
    );
  }
  
  // Types for governance config
  export interface GovernanceConfig {
    authority: PublicKey;
    stakingPool: PublicKey;
    stakingContract: PublicKey;
    parameterBounds: ParameterBounds;
    timeMultipliers: TimeMultipliers;
    proposalSettings: ProposalSettings;
    executionSettings: ExecutionSettings;
    emergencySettings: EmergencySettings;
    version: number;
    createdAt: anchor.BN;
    lastUpdated: anchor.BN;
    bump: number;
  }
  
  export interface ParameterBounds {
    minQuorumPercentage: number;
    maxQuorumPercentage: number;
    minProposalStakeBase: anchor.BN;
    maxProposalStakeBase: anchor.BN;
    minVotingPeriodHours: number;
    maxVotingPeriodHours: number;
    minExecutionDelayHours: number;
    maxExecutionDelayHours: number;
    minStakeDurationDays: number;
    maxTreasuryWithdrawalPercentage: number;
    spamPreventionCooldownHours: number;
  }
  
  export interface TimeMultipliers {
    tier1Days: number;
    tier1Multiplier: number;
    tier2Days: number;
    tier2Multiplier: number;
    tier3Multiplier: number;
  }
  
  export interface ProposalSettings {
    baseProposalStake: anchor.BN;
    stakeEscalationFactor: number;
    maxEscalationMultiplier: number;
    defaultQuorumPercentage: number;
    defaultVotingPeriodHours: number;
    proposalFeePercentage: number;
    refundThresholdPercentage: number;
    maxConcurrentProposals: number;
  }
  
  export interface ExecutionSettings {
    treasuryThresholdForMultisig: anchor.BN;
    multisigRequiredApprovals: number;
    autoExecutionEnabled: boolean;
    executionGracePeriodHours: number;
  }
  
  export interface EmergencySettings {
    emergencyMultisig: PublicKey;
    emergencyOverrideEnabled: boolean;
    emergencyQuorumReduction: number;
    emergencyVotingPeriodHours: number;
    emergencyCooldownHours: number;
  }
  
  export interface ProposalValidationResult {
    requiredStake: anchor.BN;
    hasSufficientStake: boolean;
    meetsDurationRequirement: boolean;
    canPropose: boolean;
  }
  
  // Parameter update types
  export type ParameterUpdateType = 
    | { quorumThreshold: { percentage: number } }
    | { proposalStake: { amount: anchor.BN } }
    | { timeMultiplier: { tier: number; multiplier: number } }
    | { votingPeriod: { hours: number } }
    | { emergencySettings: { quorumReduction: number; votingPeriod: number } }
    | { treasuryLimit: { percentage: number } }
    | { executionDelay: { hours: number } };
  
  // === Initialize Governance Config ===
  export async function initializeGovernanceConfig() {
    const { program: stakingProgram } = getProgram();
    const { program: governanceProgram, adminKeypair } = getGovernanceConfigProgram();
  
    // Get staking pool PDA from existing staking contract
    const [stakingPoolPda] = getStakingPoolPda(stakingProgram.programId);
    const [governanceConfigPda] = getGovernanceConfigPda(stakingPoolPda);
  
    console.log("Initializing governance config...");
    console.log(`Staking Pool PDA: ${stakingPoolPda.toString()}`);
    console.log(`Governance Config PDA: ${governanceConfigPda.toString()}`);
  
    try {
      // Check if governance config already exists
      try {
        await governanceProgram.account.governanceConfig.fetch(governanceConfigPda);
        console.log("Governance config already exists");
        return {
          success: true,
          message: "Governance config already exists",
          governanceConfig: governanceConfigPda,
          stakingPool: stakingPoolPda,
        };
      } catch (error) {
        // Config doesn't exist, proceed with initialization
      }
  
      const tx = await governanceProgram.methods
        .initializeGovernanceConfig()
        .accounts({
          authority: adminKeypair.publicKey,
          stakingPool: stakingPoolPda,
          governanceConfig: governanceConfigPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([adminKeypair])
        .rpc();
  
      console.log(`Governance config initialized successfully!`);
      console.log(`Transaction: ${tx}`);
  
      return {
        success: true,
        transactionId: tx,
        governanceConfig: governanceConfigPda,
        stakingPool: stakingPoolPda,
        authority: adminKeypair.publicKey,
      };
    } catch (error) {
      console.error("Error initializing governance config:", error);
      throw error;
    }
  }
  
// === Update Governance Parameter ===
export async function updateGovernanceParameter(
  updateType: ParameterUpdateType,
  walletNumber?: number
) {
  const { program: stakingProgram } = getProgram();
  const { program: governanceProgram, adminKeypair } = getGovernanceConfigProgram();
  
  // Use mock wallet or admin wallet
  const authority = walletNumber ? getMockWalletKeypair(walletNumber) : adminKeypair;

  const [stakingPoolPda] = getStakingPoolPda(stakingProgram.programId);
  const [governanceConfigPda] = getGovernanceConfigPda(stakingPoolPda);

  console.log(`Updating governance parameter for ${walletNumber ? `wallet ${walletNumber}` : 'admin'}: ${authority.publicKey.toString()}`);
  console.log(`Update type:`, updateType);

  try {
    const tx = await governanceProgram.methods
      .updateGovernanceParameter(updateType)
      .accounts({
        authority: authority.publicKey,
        governanceConfig: governanceConfigPda,
        stakingPool: stakingPoolPda,
        governanceProposal: null, // For admin updates, no proposal needed
      })
      .signers([authority])
      .rpc();

    console.log(`Governance parameter updated successfully!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      updateType: updateType,
      walletNumber: walletNumber || 'admin',
      updatedBy: authority.publicKey,
    };
  } catch (error) {
    console.error("Error updating governance parameter:", error);
    throw error;
  }
}

// === Toggle Emergency Mode ===
export async function toggleEmergencyMode(enabled: boolean, walletNumber?: number) {
  const { program: stakingProgram } = getProgram();
  const { program: governanceProgram, adminKeypair } = getGovernanceConfigProgram();
  
  // Use mock wallet or admin wallet
  const authority = walletNumber ? getMockWalletKeypair(walletNumber) : adminKeypair;

  const [stakingPoolPda] = getStakingPoolPda(stakingProgram.programId);
  const [governanceConfigPda] = getGovernanceConfigPda(stakingPoolPda);

  console.log(`Toggling emergency mode to: ${enabled}`);
  console.log(`Authority: ${walletNumber ? `wallet ${walletNumber}` : 'admin'} - ${authority.publicKey.toString()}`);

  try {
    const tx = await governanceProgram.methods
      .toggleEmergencyMode(enabled)
      .accounts({
        authority: authority.publicKey,
        governanceConfig: governanceConfigPda,
        stakingPool: stakingPoolPda,
      })
      .signers([authority])
      .rpc();

    console.log(`Emergency mode toggled successfully!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      emergencyModeEnabled: enabled,
      walletNumber: walletNumber || 'admin',
      triggeredBy: authority.publicKey,
    };
  } catch (error) {
    console.error("Error toggling emergency mode:", error);
    throw error;
  }
}

// === Batch Update Parameters ===
export async function batchUpdateParameters(
  updates: ParameterUpdateType[],
  walletNumber?: number
) {
  const { program: stakingProgram } = getProgram();
  const { program: governanceProgram, adminKeypair } = getGovernanceConfigProgram();
  
  // Use mock wallet or admin wallet
  const authority = walletNumber ? getMockWalletKeypair(walletNumber) : adminKeypair;

  const [stakingPoolPda] = getStakingPoolPda(stakingProgram.programId);
  const [governanceConfigPda] = getGovernanceConfigPda(stakingPoolPda);

  console.log(`Batch updating ${updates.length} parameters`);
  console.log(`Authority: ${walletNumber ? `wallet ${walletNumber}` : 'admin'} - ${authority.publicKey.toString()}`);

  try {
    const tx = await governanceProgram.methods
      .batchUpdateParameters(updates)
      .accounts({
        authority: authority.publicKey,
        governanceConfig: governanceConfigPda,
        stakingPool: stakingPoolPda,
        governanceProposal: null,
      })
      .signers([authority])
      .rpc();

    console.log(`Parameters batch updated successfully!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      updatesCount: updates.length,
      updates: updates,
      walletNumber: walletNumber || 'admin',
      updatedBy: authority.publicKey,
    };
  } catch (error) {
    console.error("Error batch updating parameters:", error);
    throw error;
  }
}
  
  // === Get Governance Config Info ===
  export async function getGovernanceConfigInfo() {
    const { program: stakingProgram } = getProgram();
    const { program: governanceProgram } = getGovernanceConfigProgram();
  
    const [stakingPoolPda] = getStakingPoolPda(stakingProgram.programId);
    const [governanceConfigPda] = getGovernanceConfigPda(stakingPoolPda);
  
    try {
      const configInfo = await governanceProgram.account.governanceConfig.fetch(governanceConfigPda) as GovernanceConfig;
  
      console.log("=== Governance Config Information ===");
      console.log(`Authority: ${configInfo.authority.toString()}`);
      console.log(`Staking Pool: ${configInfo.stakingPool.toString()}`);
      console.log(`Staking Contract: ${configInfo.stakingContract.toString()}`);
      console.log(`Version: ${configInfo.version}`);
      console.log(`Created At: ${new Date(configInfo.createdAt.toNumber() * 1000)}`);
      console.log(`Last Updated: ${new Date(configInfo.lastUpdated.toNumber() * 1000)}`);
  
      console.log("\n=== Parameter Bounds ===");
      console.log(`Quorum Range: ${configInfo.parameterBounds.minQuorumPercentage / 100}% - ${configInfo.parameterBounds.maxQuorumPercentage / 100}%`);
      console.log(`Proposal Stake Range: ${configInfo.parameterBounds.minProposalStakeBase.toString()} - ${configInfo.parameterBounds.maxProposalStakeBase.toString()}`);
      console.log(`Voting Period Range: ${configInfo.parameterBounds.minVotingPeriodHours}h - ${configInfo.parameterBounds.maxVotingPeriodHours}h`);
      console.log(`Min Stake Duration: ${configInfo.parameterBounds.minStakeDurationDays} days`);
  
      console.log("\n=== Time Multipliers ===");
      console.log(`Tier 1 (${configInfo.timeMultipliers.tier1Days} days): ${configInfo.timeMultipliers.tier1Multiplier / 100}x`);
      console.log(`Tier 2 (${configInfo.timeMultipliers.tier2Days} days): ${configInfo.timeMultipliers.tier2Multiplier / 100}x`);
      console.log(`Tier 3 (365+ days): ${configInfo.timeMultipliers.tier3Multiplier / 100}x`);
  
      console.log("\n=== Proposal Settings ===");
      console.log(`Base Proposal Stake: ${configInfo.proposalSettings.baseProposalStake.toString()}`);
      console.log(`Escalation Factor: ${configInfo.proposalSettings.stakeEscalationFactor / 100}x`);
      console.log(`Max Escalation: ${configInfo.proposalSettings.maxEscalationMultiplier / 100}x`);
      console.log(`Default Quorum: ${configInfo.proposalSettings.defaultQuorumPercentage / 100}%`);
      console.log(`Default Voting Period: ${configInfo.proposalSettings.defaultVotingPeriodHours}h`);
  
      console.log("\n=== Emergency Settings ===");
      console.log(`Emergency Override Enabled: ${configInfo.emergencySettings.emergencyOverrideEnabled}`);
      console.log(`Emergency Quorum Reduction: ${configInfo.emergencySettings.emergencyQuorumReduction / 100}%`);
      console.log(`Emergency Voting Period: ${configInfo.emergencySettings.emergencyVotingPeriodHours}h`);
  
      return {
        success: true,
        configInfo: configInfo,
        governanceConfigPda: governanceConfigPda,
      };
    } catch (error) {
      console.error("Error fetching governance config info:", error);
      if (error instanceof Error && error.message.includes("Account does not exist")) {
        return {
          success: false,
          message: "Governance config not initialized",
        };
      }
      throw error;
    }
  }
  
  // === Client-side Voting Power Calculation with Config ===
  export function calculateConfigurableVotingPower(
    stakeAmount: number, 
    stakeDurationDays: number, 
    timeMultipliers: TimeMultipliers
  ): number {
    // Base power calculation (same as original)
    let basePower: number;
    if (stakeAmount <= 100_000) {
      basePower = stakeAmount;
    } else {
      basePower = 100_000 + Math.floor(Math.sqrt(stakeAmount - 100_000));
    }
  
    // Use configurable time multipliers
    let timeMultiplier: number;
    if (stakeDurationDays >= timeMultipliers.tier2Days) {
      timeMultiplier = timeMultipliers.tier3Multiplier;
    } else if (stakeDurationDays >= timeMultipliers.tier1Days) {
      timeMultiplier = timeMultipliers.tier2Multiplier;
    } else {
      timeMultiplier = timeMultipliers.tier1Multiplier;
    }
  
    return Math.floor((basePower * timeMultiplier) / 100);
  }
  
  // === Quick Parameter Updates ===
  export async function updateTimeMultiplier(tier: number, multiplier: number) {
    return updateGovernanceParameter({
      timeMultiplier: { tier, multiplier }
    });
  }
  
  export async function updateQuorumThreshold(percentage: number) {
    return updateGovernanceParameter({
      quorumThreshold: { percentage }
    });
  }
  
  export async function updateProposalStake(amount: number) {
    return updateGovernanceParameter({
      proposalStake: { amount: new anchor.BN(amount * Math.pow(10, 6)) }
    });
  }
  
  export async function updateVotingPeriod(hours: number) {
    return updateGovernanceParameter({
      votingPeriod: { hours }
    });
  }
  
  
  // === Integration Test ===
  export async function testGovernanceIntegration() {
    console.log("=== Testing Governance Config Integration ===");
  
    try {
      // Test all major functions
      await initializeGovernanceConfig();
      await getGovernanceConfigInfo();
      
      // Test parameter updates
      await updateTimeMultiplier(2, 155); // Tier 2: 1.55x
      await updateQuorumThreshold(3000); // 30%
      
      // Test with mock wallets
      await bulkTestGovernanceConfig([1, 2, 3]);
      
      // Test emergency mode
      await toggleEmergencyMode(true);
      await toggleEmergencyMode(false);
  
      console.log("=== Integration test passed! ===");
      return { success: true };
    } catch (error) {
      console.error("Integration test failed:", error);
      throw error;
    }
  }



// === Get Voting Power with Config ===
export async function getVotingPowerWithConfig(walletNumber?: number) {
  const { program: stakingProgram, adminKeypair } = getProgram();
  const { program: governanceProgram } = getGovernanceConfigProgram();
  
  // Use mock wallet or admin wallet
  const user = walletNumber ? getMockWalletKeypair(walletNumber) : adminKeypair;

  const [stakingPoolPda] = getStakingPoolPda(stakingProgram.programId);
  const [governanceConfigPda] = getGovernanceConfigPda(stakingPoolPda);
  const [userStakingAccountPda] = getUserStakePda(stakingProgram.programId, user.publicKey);

  console.log(`Calculating configurable voting power for ${walletNumber ? `wallet ${walletNumber}` : 'admin'}: ${user.publicKey.toString()}`);
  console.log(`User Staking Account PDA: ${userStakingAccountPda.toString()}`);
  console.log(`Governance Config PDA: ${governanceConfigPda.toString()}`);

  try {
    // First, let's verify the user staking account exists and get staking info
    let stakingAccountInfo: UserStakingAccount;
    try {
      stakingAccountInfo = await stakingProgram.account.userStakingAccount.fetch(userStakingAccountPda) as UserStakingAccount;
      console.log(`User has staked amount: ${stakingAccountInfo.stakedAmount.toString()}`);
      console.log(`Stake timestamp: ${new Date(stakingAccountInfo.timestamp.toNumber() * 1000).toISOString()}`);
    } catch (error) {
      console.error(`${walletNumber ? `Wallet ${walletNumber}` : 'Admin'} staking account does not exist or user has not staked yet`);
      throw new Error("User must stake tokens before calculating voting power");
    }

    // Execute the transaction
    const tx = await governanceProgram.methods
      .getVotingPowerWithConfig()
      .accounts({
        user: user.publicKey,
        governanceConfig: governanceConfigPda,
        userStakingAccount: userStakingAccountPda,
        stakingPool: stakingPoolPda,
      })
      .signers([user])
      .rpc();

    console.log(`Voting power calculated with config successfully!`);
    console.log(`Transaction: ${tx}`);

    // Calculate stake duration for additional info
    const now = Math.floor(Date.now() / 1000);
    const stakeDurationDays = Math.floor((now - stakingAccountInfo.timestamp.toNumber()) / 86400);
    
    return {
      success: true,
      transactionId: tx,
      walletNumber: walletNumber || 'admin',
      userPublicKey: user.publicKey,
      stakeAmount: stakingAccountInfo.stakedAmount.toString(),
      stakeDurationDays: stakeDurationDays,
      stakeTimestamp: stakingAccountInfo.timestamp.toString(),
    };
  } catch (error) {
    console.error("Error calculating voting power with config:", error);
    throw error;
  }
}

// === Validate Proposal Requirements ===
export async function validateProposalRequirements(
  proposerHistory: number,
  walletNumber?: number
) {
  const { program: stakingProgram, adminKeypair } = getProgram();
  const { program: governanceProgram } = getGovernanceConfigProgram();
  
  // Use mock wallet or admin wallet
  const user = walletNumber ? getMockWalletKeypair(walletNumber) : adminKeypair;

  const [stakingPoolPda] = getStakingPoolPda(stakingProgram.programId);
  const [governanceConfigPda] = getGovernanceConfigPda(stakingPoolPda);
  const [userStakingAccountPda] = getUserStakePda(stakingProgram.programId, user.publicKey);

  console.log(`Validating proposal requirements for ${walletNumber ? `wallet ${walletNumber}` : 'admin'}: ${user.publicKey.toString()}`);
  console.log(`Proposer history: ${proposerHistory}`);

  try {
    // First, let's verify the user staking account exists
    let stakingAccountInfo: UserStakingAccount;
    try {
      stakingAccountInfo = await stakingProgram.account.userStakingAccount.fetch(userStakingAccountPda) as UserStakingAccount;
      console.log(`User has staked amount: ${stakingAccountInfo.stakedAmount.toString()}`);
    } catch (error) {
      console.error(`${walletNumber ? `Wallet ${walletNumber}` : 'Admin'} staking account does not exist or user has not staked yet`);
      throw new Error("User must stake tokens before validating proposal requirements");
    }

    // Execute the transaction
    const tx = await governanceProgram.methods
      .validateProposalRequirements(proposerHistory)
      .accounts({
        user: user.publicKey,
        governanceConfig: governanceConfigPda,
        userStakingAccount: userStakingAccountPda,
        stakingPool: stakingPoolPda,
      })
      .signers([user])
      .rpc();

    console.log(`Proposal requirements validated successfully!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      proposerHistory: proposerHistory,
      walletNumber: walletNumber || 'admin',
      userPublicKey: user.publicKey,
      userStakeAmount: stakingAccountInfo.stakedAmount.toString(),
    };
  } catch (error) {
    console.error("Error validating proposal requirements:", error);
    throw error;
  }
}

// === Helper function to ensure user has staked ===
export async function ensureUserHasStaked(walletNumber?: number, minAmount = 1000) {
  const stakingStatus = await checkUserStakingStatus(walletNumber);
  
  if (!stakingStatus.exists) {
    console.log(`${walletNumber ? `Wallet ${walletNumber}` : 'Admin'} has not staked yet. You can stake tokens first using the staking functions.`);
    return false;
  }
  
  const stakedAmount = parseInt(stakingStatus.stakedAmount);
  if (stakedAmount < minAmount * Math.pow(10, 6)) { // Convert to micro units
    console.log(`${walletNumber ? `Wallet ${walletNumber}` : 'Admin'} has staked ${stakedAmount / Math.pow(10, 6)} tokens, but minimum ${minAmount} required.`);
    return false;
  }
  
  return true;
}

// === Safe versions with auto-check ===
export async function getVotingPowerWithConfigSafe(walletNumber?: number) {
  const canProceed = await ensureUserHasStaked(walletNumber);
  if (!canProceed) {
    throw new Error(`${walletNumber ? `Wallet ${walletNumber}` : 'Admin'} needs to stake tokens before calculating voting power`);
  }
  
  return getVotingPowerWithConfig(walletNumber);
}

export async function validateProposalRequirementsSafe(
  proposerHistory: number,
  walletNumber?: number
) {
  const canProceed = await ensureUserHasStaked(walletNumber);
  if (!canProceed) {
    throw new Error(`${walletNumber ? `Wallet ${walletNumber}` : 'Admin'} needs to stake tokens before validating proposal requirements`);
  }
  
  return validateProposalRequirements(proposerHistory, walletNumber);
}

// === Enhanced Bulk Testing with Better Error Handling ===
export async function bulkTestGovernanceConfig(walletNumbers?: number[]) {
  const targetWallets = walletNumbers || [1, 2, 3, 4, 5];
  const results = [];

  console.log(`Testing governance config for wallets: ${targetWallets.join(', ')}`);

  for (const walletNum of targetWallets) {
    try {
      const wallet = getMockWalletKeypair(walletNum);
      const { program: stakingProgram } = getProgram();
      const [userStakingAccountPda] = getUserStakePda(stakingProgram.programId, wallet.publicKey);
      
      // Check if user has staked first
      try {
        const stakingAccountInfo = await stakingProgram.account.userStakingAccount.fetch(userStakingAccountPda) as UserStakingAccount;
        console.log(`Wallet ${walletNum} has staked amount: ${stakingAccountInfo.stakedAmount.toString()}`);
        
        // Test voting power calculation
        await getVotingPowerWithConfig(walletNum);
        
        // Test proposal requirements validation
        await validateProposalRequirements(Math.floor(Math.random() * 3), walletNum);

        results.push({
          walletNumber: walletNum,
          success: true,
          publicKey: wallet.publicKey.toString(),
          stakedAmount: stakingAccountInfo.stakedAmount.toString(),
        });
      } catch (stakingError) {
        console.log(`Wallet ${walletNum} has not staked yet, skipping governance tests`);
        results.push({
          walletNumber: walletNum,
          success: false,
          publicKey: wallet.publicKey.toString(),
          error: "User has not staked tokens yet",
          skipped: true,
        });
      }
    } catch (error: any) {
      results.push({
        walletNumber: walletNum,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    operation: 'bulk_test_governance_config',
    results: results,
  };
}

// === Add helper function to check if user has staked ===
export async function checkUserStakingStatus(walletNumber?: number) {
  const { program: stakingProgram, adminKeypair } = getProgram();
  const user = walletNumber ? getMockWalletKeypair(walletNumber) : adminKeypair;
  const [userStakingAccountPda] = getUserStakePda(stakingProgram.programId, user.publicKey);

  try {
    const stakingAccountInfo = await stakingProgram.account.userStakingAccount.fetch(userStakingAccountPda) as UserStakingAccount;
    return {
      exists: true,
      walletNumber: walletNumber || 'admin',
      publicKey: user.publicKey.toString(),
      stakedAmount: stakingAccountInfo.stakedAmount.toString(),
      timestamp: stakingAccountInfo.timestamp.toString(),
      lastUpdated: stakingAccountInfo.lastUpdated.toString(),
    };
  } catch (error) {
    return {
      exists: false,
      walletNumber: walletNumber || 'admin',
      publicKey: user.publicKey.toString(),
      message: "User has not staked any tokens yet",
    };
  }
}

// === Updated Demo with Better Flow ===
export async function demonstrateGovernanceConfig() {
  console.log("=== Governance Config Demo ===");

  try {
    // 1. Initialize governance config
    console.log("\n1. Initializing governance config...");
    const initResult = await initializeGovernanceConfig();
    
    // 2. Get initial config info
    console.log("\n2. Getting initial config info...");
    await getGovernanceConfigInfo();

    // 3. Update time multiplier
    console.log("\n3. Updating time multiplier...");
    await updateTimeMultiplier(1, 125); // Change tier 1 from 1.2x to 1.25x

    // 4. Update quorum threshold
    console.log("\n4. Updating quorum threshold...");
    await updateQuorumThreshold(2500); // Change to 25%

    // 5. Check if admin has staked
    console.log("\n5. Checking admin staking status...");
    const adminStakingStatus = await checkUserStakingStatus();
    console.log("Admin staking status:", adminStakingStatus);

    if (adminStakingStatus.exists) {
      // 6. Test voting power calculation with config
      console.log("\n6. Testing voting power with config...");
      await getVotingPowerWithConfig();

      // 7. Validate proposal requirements
      console.log("\n7. Validating proposal requirements...");
      await validateProposalRequirements(0); // No previous proposals
    } else {
      console.log("\n6. Skipping voting power and proposal tests - admin has not staked");
      console.log("   You can run staking operations first, then test governance functions");
    }

    // 8. Test with mock wallets that have staked
    console.log("\n8. Testing with mock wallets...");
    await bulkTestGovernanceConfig([1, 2, 3]);

    // 9. Get updated config info
    console.log("\n9. Getting updated config info...");
    await getGovernanceConfigInfo();

    console.log("\n=== Demo completed successfully! ===");

    return {
      success: true,
      message: "Governance config demo completed successfully",
      adminStakingStatus: adminStakingStatus,
    };
  } catch (error) {
    console.error("Demo failed:", error);
    throw error;
  }
}

// === Bulk Operations for Testing ===
export async function bulkTestVotingPower(walletNumbers?: number[]) {
  const targetWallets = walletNumbers || [1, 2, 3, 4, 5];
  const results = [];

  console.log(`Testing voting power calculation for wallets: ${targetWallets.join(', ')}`);

  for (const walletNum of targetWallets) {
    try {
      const result = await getVotingPowerWithConfig(walletNum);
      results.push(result);
    } catch (error: any) {
      results.push({
        success: false,
        walletNumber: walletNum,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    operation: 'bulk_test_voting_power',
    results: results,
  };
}

export async function bulkTestProposalValidation(walletNumbers?: number[]) {
  const targetWallets = walletNumbers || [1, 2, 3, 4, 5];
  const results = [];

  console.log(`Testing proposal validation for wallets: ${targetWallets.join(', ')}`);

  for (const walletNum of targetWallets) {
    try {
      const result = await validateProposalRequirements(Math.floor(Math.random() * 3), walletNum);
      results.push(result);
    } catch (error: any) {
      results.push({
        success: false,
        walletNumber: walletNum,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    operation: 'bulk_test_proposal_validation',
    results: results,
  };
}