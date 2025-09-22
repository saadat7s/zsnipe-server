import app from './app';
import { Connection } from '@solana/web3.js';

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Initialize Solana connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  'confirmed'
);

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 ZeroSnipe DAO Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Solana Network: ${process.env.SOLANA_NETWORK || 'devnet'}`);
});

// Test Solana connection
async function testSolanaConnection() {
  try {
    const version = await connection.getVersion();
    console.log(`✅ Solana connection established:`, version);
  } catch (error) {
    console.error('❌ Failed to connect to Solana:', error);
  }
}

// Initialize services
testSolanaConnection();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});