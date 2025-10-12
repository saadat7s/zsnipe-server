import { 
  buildTextExecutionData,
  buildTreasuryTransferExecutionData,
  buildParameterUpdateExecutionData,
} from "../utils/helpers";

// === Client-side Execution Data Builders ===
export function buildTextExecutionDataInterface(title: string, description: string) {
  try {
    const metadata = `${title}|${description}`;
    const executionData = buildTextExecutionData(metadata);
    
    return {
      success: true,
      data: {
        executionData: Array.from(executionData),
        type: "text",
        title,
        description,
      }
    };
  } catch (error: any) {
    console.error("Error building text execution data:", error);
    return { 
      success: false, 
      error: error.message || 'Failed to build text execution data' 
    };
  }
}

export function buildTreasuryTransferExecutionDataInterface(
  recipient: string,
  amount: number,
  title: string,
  description: string
) {
  try {
    const amountMicroTokens = amount * 1_000_000; // Convert to micro-tokens
    const executionData = buildTreasuryTransferExecutionData(recipient, amountMicroTokens);
    
    return {
      success: true,
      data: {
        executionData: Array.from(executionData),
        type: "treasuryTransfer",
        recipient,
        amount,
        title,
        description,
      }
    };
  } catch (error: any) {
    console.error("Error building treasury transfer execution data:", error);
    return { 
      success: false, 
      error: error.message || 'Failed to build treasury transfer execution data' 
    };
  }
}

export function buildParameterUpdateExecutionDataInterface(
  parameterName: string,
  newValue: number,
  title: string,
  description: string
) {
  try {
    // Convert parameter name to parameter ID
    let parameterId: number;
    switch (parameterName.toLowerCase()) {
      case 'quorum':
        parameterId = 0;
        break;
      case 'threshold':
        parameterId = 1;
        break;
      case 'timelock':
        parameterId = 2;
        break;
      default:
        throw new Error(`Invalid parameter name: ${parameterName}. Must be 'quorum', 'threshold', or 'timelock'`);
    }

    const executionData = buildParameterUpdateExecutionData(parameterId, newValue);
    
    return {
      success: true,
      data: {
        executionData: Array.from(executionData),
        type: "parameterUpdate",
        parameterName,
        newValue,
        title,
        description,
      }
    };
  } catch (error: any) {
    console.error("Error building parameter update execution data:", error);
    return { 
      success: false, 
      error: error.message || 'Failed to build parameter update execution data' 
    };
  }
}
