import { createApp } from './app';
import { config } from './config/env';
import './config/database';
import { countAdmins } from './models/adminModel';
import { storage } from './services/storage';
import { logger } from './utils/logger';

const app = createApp();

app.listen(config.port, config.host, async () => {
  logger.info(`CertiVault API listening on http://${config.host}:${config.port} (${config.nodeEnv})`);
  logger.info(`Database: ${config.databasePath}`);

  if (storage.backend === 'LOCAL') {
    logger.warn('STORAGE: LOCAL DEVELOPMENT FOLDER — files are NOT being stored in Amazon S3.');
    logger.warn('         Set STORAGE_DRIVER=s3 and S3_BUCKET_NAME to use AWS.');
  }
  const health = await storage.checkHealth();
  (health.ok ? logger.info : logger.error)(`Storage: ${health.message}`);

  if (countAdmins() === 0) {
    logger.warn('No administrator account exists yet. Create one with: npm run create-admin');
  }
});
