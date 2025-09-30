import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ZeroSnipe DAO API',
      version: '1.0.0',
      description: 'API for ZeroSnipe staking, governance, and voting system on Solana. All transaction endpoints return unsigned transactions that must be signed by the user wallet.',
      contact: {
        name: 'API Support',
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        // url: 'https://api.zerosnipe.io',
        // description: 'Production server'
      }
    ],
    tags: [
      {
        name: 'Admin',
        description: 'Admin-only operations for initializing pools and escrows'
      },
      {
        name: 'Transactions',
        description: 'Create unsigned transactions for client-side signing'
      },
      {
        name: 'Staking Data',
        description: 'Read-only endpoints for staking information'
      },
      {
        name: 'Governance Data',
        description: 'Read-only endpoints for governance information'
      },
      {
        name: 'Proposals',
        description: 'Proposal-related data and operations'
      },
      {
        name: 'Voting',
        description: 'Vote-related data and operations'
      },
      {
        name: 'Utilities',
        description: 'Helper endpoints for calculations and previews'
      }
    ],
    components: {
      schemas: {
        TransactionResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the transaction was created successfully'
            },
            message: {
              type: 'string',
              description: 'Status message'
            },
            transaction: {
              type: 'string',
              description: 'Base64-encoded serialized transaction for client signing'
            },
            accounts: {
              type: 'object',
              description: 'Relevant account addresses used in the transaction'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message'
            }
          }
        },
        StakingPoolInfo: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean'
            },
            data: {
              type: 'object',
              properties: {
                authority: { type: 'string' },
                initializer: { type: 'string' },
                totalStakedAmount: { type: 'string' },
                mintAddress: { type: 'string' },
                escrowAccount: { type: 'string' },
                isActive: { type: 'boolean' },
                tokenPriceUsdMicro: { type: 'string' },
                createdAt: { type: 'number' },
                priceLastUpdated: { type: 'number' }
              }
            }
          }
        },
        UserStakingInfo: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                staker: { type: 'string' },
                stakedAmount: { type: 'number' },
                timestamp: { type: 'number' },
                lastUpdated: { type: 'number' },
                bump: { type: 'number' }
              }
            }
          }
        },
        GovernanceInfo: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                staker: { type: 'string' },
                participationCount: { type: 'number' },
                lastVoteTimestamp: { type: 'number' },
                stakeLockEnd: { type: 'number' },
                isCurrentlyLocked: { type: 'boolean' },
                votingPowerCache: { type: 'number' },
                createdAt: { type: 'number' }
              }
            }
          }
        },
        ProposalInfo: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                proposalId: { type: 'number' },
                title: { type: 'string' },
                description: { type: 'string' },
                proposer: { type: 'string' },
                proposalType: { type: 'object' },
                status: { type: 'object' },
                votingPeriodDays: { type: 'number' },
                createdAt: { type: 'number' },
                votingEndsAt: { type: 'number' },
                finalizedAt: { type: 'number' },
                executedAt: { type: 'number' },
                timelockEnd: { type: 'number' },
                votes: {
                  type: 'object',
                  properties: {
                    yes: { type: 'number' },
                    no: { type: 'number' },
                    abstain: { type: 'number' }
                  }
                },
                totalVoters: { type: 'number' },
                depositAmount: { type: 'number' },
                depositRefunded: { type: 'boolean' },
                proposalAccount: { type: 'string' }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './src/controllers/*.ts']
};

export const swaggerSpec = swaggerJsdoc(options);