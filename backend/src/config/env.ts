import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ quiet: true });

const backendRoot = path.resolve(__dirname, '..', '..', ...(__dirname.includes(`${path.sep}dist${path.sep}`) ? ['..'] : []));

function resolveFromBackend(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(backendRoot, p);
}

function toInt(value: string | undefined, fallback: number): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const jwtSecret = process.env.JWT_SECRET ?? '';
if (jwtSecret.length < 32 || jwtSecret.startsWith('replace-with')) {
  throw new Error(
    'JWT_SECRET is missing or too short. Set a random value of at least 32 characters in backend/.env ' +
      "(generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\")",
  );
}

const storageDriver = (process.env.STORAGE_DRIVER ?? 'local').toLowerCase();
if (storageDriver !== 's3' && storageDriver !== 'local') {
  throw new Error(`STORAGE_DRIVER must be "s3" or "local" (got "${storageDriver}")`);
}

const bucket = (process.env.S3_BUCKET_NAME ?? '').trim();
if (storageDriver === 's3' && !bucket) {
  throw new Error('STORAGE_DRIVER=s3 requires S3_BUCKET_NAME to be set');
}

export const config = {
  nodeEnv,
  isProduction,
  host: process.env.HOST ?? '127.0.0.1',
  port: toInt(process.env.PORT, 4000),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  databasePath: resolveFromBackend(process.env.DATABASE_PATH ?? './database/certivault.db'),
  publicAppUrl: (process.env.PUBLIC_APP_URL ?? 'http://localhost:5173').replace(/\/+$/, ''),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  trustProxy: process.env.TRUST_PROXY === 'true',
  storageDriver: storageDriver as 's3' | 'local',
  localStorageDir: resolveFromBackend(process.env.LOCAL_STORAGE_DIR ?? './storage'),
  aws: {
    region: process.env.AWS_REGION ?? 'ap-south-1',
    bucket,
  },
  maxUploadBytes: toInt(process.env.MAX_UPLOAD_MB, 5) * 1024 * 1024,
  presignedUrlTtlSeconds: toInt(process.env.PRESIGNED_URL_TTL_SECONDS, 300),
} as const;
