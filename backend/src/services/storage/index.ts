import { config } from '../../config/env';
import { LocalStorageService } from './localStorageService';
import { S3StorageService } from './s3StorageService';
import type { StorageService } from './types';

function createStorage(): StorageService {
  if (config.storageDriver === 's3') {
    return new S3StorageService(config.aws.bucket, config.aws.region, config.presignedUrlTtlSeconds);
  }
  return new LocalStorageService(config.localStorageDir, config.jwtSecret, config.presignedUrlTtlSeconds);
}

export const storage: StorageService = createStorage();
export { LocalStorageService, S3StorageService };
export type { StorageService };
