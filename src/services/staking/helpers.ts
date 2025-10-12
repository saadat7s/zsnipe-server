import { PublicKey } from "@solana/web3.js";
import { getTreasuryPda, getStakingPoolPda } from "./getPDAs";
import { getProgram } from "./getProgram";

// Helper function to convert proposal type number to enum object
export function getProposalTypeEnum(proposalType: number) {
  switch (proposalType) {
    case 0: return { text: {} };
    case 1: return { treasuryTransfer: {} };
    case 2: return { parameterUpdate: {} };
    default: throw new Error(`Invalid proposal type: ${proposalType}`);
  }
}

// === Execution Data Builders ===

export function buildTextExecutionData(metadata?: string): number[] {
  if (!metadata) return [];
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(metadata));
}

export function buildTreasuryTransferExecutionData(
  recipientAddress: string,
  amountMicroTokens: number
): number[] {
  if (!recipientAddress || amountMicroTokens <= 0) {
    throw new Error("Invalid treasury transfer parameters");
  }

  const recipientPubkey = new PublicKey(recipientAddress);
  const recipientBytes = Array.from(recipientPubkey.toBytes());

  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(amountMicroTokens));
  const amountBytes = Array.from(amountBuffer);

  return [...recipientBytes, ...amountBytes];
}

export function buildParameterUpdateExecutionData(
  parameterId: number,
  newValue: number
): number[] {
  if (![0, 1, 2].includes(parameterId)) {
    throw new Error("Parameter ID must be 0 (Quorum), 1 (Threshold), or 2 (Timelock)");
  }

  if (parameterId === 0 && (newValue < 1 || newValue > 100)) {
    throw new Error("Quorum percentage must be between 1 and 100");
  }
  if (parameterId === 1 && (newValue < 51 || newValue > 100)) {
    throw new Error("Passing threshold must be between 51 and 100");
  }
  if (parameterId === 2 && newValue > 30 * 86400) {
    throw new Error("Timelock duration must be <= 30 days (2592000 seconds)");
  }

  const parameterIdByte = [parameterId];
  const valueBuffer = Buffer.alloc(8);
  valueBuffer.writeBigUInt64LE(BigInt(newValue));
  const valueBytes = Array.from(valueBuffer);

  return [...parameterIdByte, ...valueBytes];
}

// === Treasury Account Helpers ===

export async function getTreasuryAccount() {
  const { program } = getProgram();
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [treasuryAccount] = getTreasuryPda(program.programId, stakingPool);

  return {
    address: treasuryAccount.toString(),
    publicKey: treasuryAccount,
  };
}

// === Execution Data Decoders ===

export function decodeTreasuryTransferExecutionData(executionData: number[]) {
  if (executionData.length !== 40) {
    throw new Error(`Invalid treasury transfer data length: ${executionData.length}`);
  }

  const recipientBytes = executionData.slice(0, 32);
  const recipient = new PublicKey(Buffer.from(recipientBytes));

  const amountBytes = Buffer.from(executionData.slice(32, 40));
  const amount = Number(amountBytes.readBigUInt64LE(0));

  return {
    recipient: recipient.toString(),
    amountMicroTokens: amount,
    amountTokens: amount / 1_000_000,
  };
}

export function decodeParameterUpdateExecutionData(executionData: number[]) {
  if (executionData.length !== 9) {
    throw new Error(`Invalid parameter update data length: ${executionData.length}`);
  }

  const parameterId = executionData[0];
  const valueBytes = Buffer.from(executionData.slice(1, 9));
  const value = Number(valueBytes.readBigUInt64LE(0));

  const paramNames = [
    "Quorum Percentage",
    "Passing Threshold",
    "Timelock Duration (seconds)",
  ];
  const paramName = paramNames[parameterId] || "Unknown";

  return {
    parameterId,
    parameterName: paramName,
    newValue: value,
  };
}
