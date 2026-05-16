import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import apiRoutes from './routes/api.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp(): express.Express {
  const app = express();
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', apiRoutes);
  app.use(errorHandler);
  return app;
}
