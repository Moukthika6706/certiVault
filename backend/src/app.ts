import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import routes from './routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  // Behind Nginx on EC2: trust one proxy hop so req.ip is the real client IP.
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Same-origin requests (no Origin header) and configured dev origins only.
        callback(null, !origin || config.corsOrigins.includes(origin));
      },
      methods: ['GET', 'POST', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '100kb' }));

  app.use('/api', routes);
  app.use('/api', notFoundHandler);
  app.use(errorHandler);

  return app;
}
