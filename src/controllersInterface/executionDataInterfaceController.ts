import { Request, Response } from 'express';
import { 
  buildTextExecutionDataInterface,
  buildTreasuryTransferExecutionDataInterface,
  buildParameterUpdateExecutionDataInterface,
} from '../modules/servicesInterface/executionDataServicesInterface';

// === Build Text Execution Data ===
export async function buildTextExecutionDataController(req: Request, res: Response) {
  try {
    const { title, description } = req.body;
    
    if (!title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: "Title and description are required" 
      });
    }

    const result = buildTextExecutionDataInterface(title, description);
    res.json(result);
  } catch (error: any) {
    console.error("Error in buildTextExecutionDataController:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Build Treasury Transfer Execution Data ===
export async function buildTreasuryExecutionDataControllerInterface(req: Request, res: Response) {
  try {
    const { recipient, amount, title, description } = req.body;
    
    if (!recipient || !amount || !title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: "Recipient, amount, title, and description are required" 
      });
    }

    const result = buildTreasuryTransferExecutionDataInterface(recipient, amount, title, description);
    res.json(result);
  } catch (error: any) {
    console.error("Error in buildTreasuryExecutionDataControllerInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Build Parameter Update Execution Data ===
export async function buildParameterExecutionDataController(req: Request, res: Response) {
  try {
    const { parameterName, newValue, title, description } = req.body;
    
    if (!parameterName || newValue === undefined || !title || !description) {
      return res.status(400).json({ 
        success: false, 
        message: "Parameter name, new value, title, and description are required" 
      });
    }

    const result = buildParameterUpdateExecutionDataInterface(parameterName, newValue, title, description);
    res.json(result);
  } catch (error: any) {
    console.error("Error in buildParameterExecutionDataController:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}
