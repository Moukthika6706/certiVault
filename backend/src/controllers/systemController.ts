import type { Request, Response } from 'express';
import { config } from '../config/env';
import { getCallerIdentity, getInstanceMetadata } from '../services/awsInfoService';
import { storage } from '../services/storage';
import packageJson from '../../package.json';

const startedAt = new Date().toISOString();

export function health(_req: Request, res: Response) {
  res.json({ status: 'ok', storage: storage.backend, time: new Date().toISOString() });
}

/** Admin-only live view of the cloud infrastructure the app is running on. */
export async function systemInfo(_req: Request, res: Response) {
  const [storageHealth, identityResult, instance] = await Promise.all([
    storage.checkHealth(),
    getCallerIdentity(),
    getInstanceMetadata(),
  ]);

  const region = instance?.region ?? config.aws.region;

  res.json({
    app: {
      name: 'CertiVault',
      version: packageJson.version,
      environment: config.nodeEnv,
      nodeVersion: process.version,
      startedAt,
      uptimeSeconds: Math.round(process.uptime()),
      publicAppUrl: config.publicAppUrl,
    },
    storage: {
      backend: storage.backend,
      description: storage.description,
      bucket: config.storageDriver === 's3' ? config.aws.bucket : null,
      region: config.storageDriver === 's3' ? config.aws.region : null,
      healthy: storageHealth.ok,
      message: storageHealth.message,
    },
    iam: {
      identity: identityResult.identity,
      error: identityResult.error,
    },
    ec2: instance,
    consoleLinks: {
      ec2: `https://${region}.console.aws.amazon.com/ec2/home?region=${region}#Instances:`,
      s3: config.aws.bucket
        ? `https://${config.aws.region}.console.aws.amazon.com/s3/buckets/${config.aws.bucket}?region=${config.aws.region}`
        : `https://console.aws.amazon.com/s3/home`,
      iam: 'https://console.aws.amazon.com/iam/home#/roles',
      cloudwatch: `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#alarmsV2:`,
    },
  });
}
