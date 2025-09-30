# Interface Services Usage Guide

This guide explains how to use the interface services for client-side transaction signing.

## Overview

The interface services (`servicesInterface.ts`, `servicesInterfaceController.ts`, `routesInterface.ts`) are designed to create unsigned transactions that can be signed by users on the client-side (e.g., with Phantom wallet).

## Key Differences from Mock Services

1. **No Mock Wallets**: Instead of using mock wallets, these services accept `userPublicKey` as a parameter
2. **Unsigned Transactions**: All transaction creation functions return base64-encoded unsigned transactions
3. **Client-Side Signing**: Transactions must be signed by the user's wallet on the frontend

## API Endpoints

### Transaction Creation Endpoints

#### Admin Endpoints
- `POST /admin/init-staking-pool` - Create initialize staking pool transaction
- `POST /admin/init-proposal-escrow` - Create initialize proposal escrow transaction

#### User Transaction Endpoints
- `POST /transactions/stake` - Create stake tokens transaction
- `POST /transactions/unstake` - Create unstake tokens transaction
- `POST /transactions/init-governance` - Create initialize governance account transaction
- `POST /transactions/calculate-voting-power` - Create calculate voting power transaction
- `POST /transactions/create-proposal` - Create proposal transaction
- `POST /transactions/cast-vote` - Create cast vote transaction

### Read-Only Data Endpoints

- `GET /data/staking-pool` - Get staking pool information
- `GET /data/user-staking?userPublicKey=...` - Get user staking information
- `GET /data/governance?userPublicKey=...` - Get governance account information
- `GET /data/eligibility?userPublicKey=...` - Check voting eligibility
- `GET /data/proposals` - List all proposals
- `GET /data/proposals/:proposalId` - Get specific proposal information
- `GET /data/proposal-requirements` - Get proposal creation requirements
- `GET /data/votes/:proposalId?userPublicKey=...` - Get vote record for a proposal
- `GET /utils/preview-voting-power?amount=...&days=...` - Preview voting power calculation

## Example Usage

### 1. Create a Stake Transaction

```javascript
// Frontend code
const response = await fetch('/api/interface/transactions/stake', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userPublicKey: 'YOUR_PUBLIC_KEY_HERE',
    amount: 1000 // Amount in ZSNIPE tokens
  })
});

const result = await response.json();

if (result.success) {
  // Deserialize the transaction
  const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));
  
  // Sign with user's wallet (e.g., Phantom)
  const signedTransaction = await window.solana.signTransaction(transaction);
  
  // Send the signed transaction
  const signature = await window.solana.sendTransaction(signedTransaction);
  console.log('Transaction signature:', signature);
}
```

### 2. Create a Vote Transaction

```javascript
// Frontend code
const response = await fetch('/api/interface/transactions/cast-vote', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userPublicKey: 'YOUR_PUBLIC_KEY_HERE',
    proposalId: 1,
    voteChoice: 0 // 0=Yes, 1=No, 2=Abstain
  })
});

const result = await response.json();

if (result.success) {
  const transaction = Transaction.from(Buffer.from(result.transaction, 'base64'));
  const signedTransaction = await window.solana.signTransaction(transaction);
  const signature = await window.solana.sendTransaction(signedTransaction);
  console.log('Vote transaction signature:', signature);
}
```

### 3. Get User Staking Information

```javascript
// Frontend code
const response = await fetch(`/api/interface/data/user-staking?userPublicKey=${userPublicKey}`);
const result = await response.json();

if (result.success) {
  console.log('User staking info:', result.data);
} else {
  console.log('User has not staked yet');
}
```

## Response Format

### Transaction Creation Responses

```json
{
  "success": true,
  "message": "Transaction created successfully!",
  "transaction": "base64-encoded-transaction",
  "accounts": {
    "userStakingAccount": "PDA_ADDRESS",
    "stakingPool": "PDA_ADDRESS",
    // ... other relevant account addresses
  }
}
```

### Data Fetching Responses

```json
{
  "success": true,
  "data": {
    // ... relevant data fields
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

## Integration with Frontend

1. **Wallet Connection**: Ensure user's wallet is connected and you have their public key
2. **Transaction Creation**: Call the appropriate endpoint to create an unsigned transaction
3. **Transaction Signing**: Use the wallet's `signTransaction` method to sign the transaction
4. **Transaction Submission**: Use the wallet's `sendTransaction` method to submit the signed transaction
5. **Confirmation**: Wait for transaction confirmation and handle success/error states

## Security Notes

- Always validate user input on both frontend and backend
- Never expose private keys in frontend code
- Use proper error handling and user feedback
- Consider implementing transaction retry logic for failed transactions
