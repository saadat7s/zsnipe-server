import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import stakingRoute from './routes/stakingRoute';
import governanceRoutes from './routes/governanceRoutes';
import proposalRoutes from './routes/proposalRoutes';
import treasuryRoutes from './routes/treasuryRoutes';
import executionRoutes from './routes/executionRoutes';
import governanceConfigRoutes from './routes/governanceConfigRoutes';
import stakingInterfaceRoutes from './routesInterface/stakingInterfaceRoutes';
import governanceInterfaceRoutes from './routesInterface/governanceInterfaceRoutes';
import proposalInterfaceRoutes from './routesInterface/proposalInterfaceRoutes';
import executionInterfaceRoutes from './routesInterface/executionInterfaceRoutes';
import treasuryInterfaceRoutes from './routesInterface/treasuryInterfaceRoutes';
import governanceConfigInterfaceRoutes from './routesInterface/governanceConfigInterfaceRoutes';
import executionDataInterfaceRoutes from './routesInterface/executionDataInterfaceRoutes';

dotenv.config();

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000'],
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'ZeroSnipe DAO API Documentation'
}));

// Swagger JSON endpoint
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// API routes
app.use('/api/staking', stakingRoute);
app.use('/api/governance', governanceRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/treasury', treasuryRoutes);
app.use('/api/execution', executionRoutes);
app.use('/api/governance-config', governanceConfigRoutes);

// Modular Interface routes
app.use('/api/zSnipe/staking', stakingInterfaceRoutes);
app.use('/api/zSnipe/governance', governanceInterfaceRoutes);
app.use('/api/zSnipe/proposals', proposalInterfaceRoutes);
app.use('/api/zSnipe/execution', executionInterfaceRoutes);
app.use('/api/zSnipe/treasury', treasuryInterfaceRoutes);
app.use('/api/zSnipe/governance-config', governanceConfigInterfaceRoutes);
app.use('/api/zSnipe/execution-data', executionDataInterfaceRoutes);

// Basic routes
app.get('/', (req, res) => {
  res.json({
    name: 'ZeroSnipe DAO API',
    version: '1.0.0',
    status: 'operational',
    documentation: '/api-docs',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Route ${req.originalUrl} not found`
  });
});

export default app;