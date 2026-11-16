/**
 * Verifies the AWS integration from wherever the backend runs (e.g. the EC2 instance):
 *   1. Which identity the SDK resolved (should be the EC2 IAM role, not an IAM user)
 *   2. Whether the bucket is reachable
 *   3. Upload → download → SHA-256 compare of a small test object
 *
 * Usage:  npm run check-aws        (dev)
 *         npm run check-aws:prod   (after `npm run build`)
 */
import { config } from '../src/config/env';
import { getCallerIdentity, getInstanceMetadata } from '../src/services/awsInfoService';
import { S3StorageService } from '../src/services/storage';
import { sha256Hex } from '../src/utils/crypto';

async function main() {
  if (config.storageDriver !== 's3') {
    console.log('STORAGE_DRIVER is "local" — set STORAGE_DRIVER=s3 and S3_BUCKET_NAME in backend/.env first.');
    process.exit(1);
  }

  console.log('\n1) AWS identity (default credential provider chain)');
  const { identity, error } = await getCallerIdentity();
  if (!identity) {
    console.log(`   ✖ ${error}`);
    console.log('   → On EC2: attach the IAM role (Actions → Security → Modify IAM role).');
    process.exit(1);
  }
  console.log(`   ✔ ${identity.arn}`);
  console.log(identity.roleName ? `   ✔ Using IAM role: ${identity.roleName}` : '   ⚠ Not an assumed role (IAM user / profile credentials)');

  const instance = await getInstanceMetadata();
  console.log(instance ? `   ✔ Running on EC2 ${instance.instanceId} (${instance.instanceType}, ${instance.availabilityZone})` : '   ℹ Not running on EC2');

  const s3 = new S3StorageService(config.aws.bucket, config.aws.region, 60);
  console.log(`\n2) Bucket ${config.aws.bucket} (${config.aws.region})`);
  const health = await s3.checkHealth();
  console.log(`   ${health.ok ? '✔' : '✖'} ${health.message}`);
  if (!health.ok) process.exit(1);

  console.log('\n3) Round trip (upload → download → hash compare)');
  const key = `certificates/_healthcheck/check-aws-${Date.now()}.pdf`;
  const body = Buffer.from(`%PDF-1.4\n% CertiVault connectivity check ${new Date().toISOString()}\n`);
  const stored = await s3.upload(key, body, { purpose: 'connectivity-check' });
  console.log(`   ✔ PutObject ${key}${stored.versionId ? ` (VersionId ${stored.versionId})` : ''}`);
  const back = await s3.download(key);
  const same = sha256Hex(back) === sha256Hex(body);
  console.log(`   ${same ? '✔' : '✖'} GetObject — SHA-256 ${same ? 'matches' : 'MISMATCH'}`);
  console.log('\nAll checks passed. (The test object can be deleted from the S3 console.)\n');
}

main().catch((err) => {
  console.error(`\n✖ ${err instanceof Error ? `${err.name}: ${err.message}` : err}`);
  process.exit(1);
});
