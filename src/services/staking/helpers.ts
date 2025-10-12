import { PublicKey } from "@solana/web3.js";

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
