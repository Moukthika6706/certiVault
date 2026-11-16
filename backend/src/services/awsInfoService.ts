import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { config } from '../config/env';

/**
 * Small helpers used by the admin "Cloud Infrastructure" page to PROVE, live,
 * that the app runs on EC2 and talks to AWS through the instance's IAM role.
 */

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out after ${ms} ms`)), ms)),
  ]);
}

export interface CallerIdentity {
  arn: string;
  account: string;
  /** e.g. "CertiVault-EC2-Role" when using an assumed role */
  roleName: string | null;
}

/**
 * sts:GetCallerIdentity needs no IAM permission. On EC2 it returns an ARN like
 * arn:aws:sts::123456789012:assumed-role/CertiVault-EC2-Role/i-0abc..., which
 * shows the SDK is using the instance role rather than hard-coded keys.
 */
export async function getCallerIdentity(): Promise<{ identity: CallerIdentity | null; error: string | null }> {
  try {
    const client = new STSClient({ region: config.aws.region, maxAttempts: 1 });
    const res = await withTimeout(client.send(new GetCallerIdentityCommand({})), 4000);
    const arn = res.Arn ?? '';
    const match = arn.match(/:assumed-role\/([^/]+)\//);
    return { identity: { arn, account: res.Account ?? '', roleName: match?.[1] ?? null }, error: null };
  } catch (err) {
    const name = err instanceof Error ? err.name : 'Error';
    return { identity: null, error: name === 'CredentialsProviderError' ? 'No AWS credentials available' : (err as Error).message };
  }
}

export interface InstanceMetadata {
  instanceId: string;
  instanceType: string;
  availabilityZone: string;
  region: string;
  publicIpv4: string | null;
}

let metadataCache: { value: InstanceMetadata | null; at: number } | null = null;

/** Reads EC2 instance metadata using IMDSv2 (session token). Returns null when not on EC2. */
export async function getInstanceMetadata(): Promise<InstanceMetadata | null> {
  if (metadataCache && Date.now() - metadataCache.at < 5 * 60_000) return metadataCache.value;

  const base = 'http://169.254.169.254/latest';
  let value: InstanceMetadata | null = null;
  try {
    const tokenRes = await fetch(`${base}/api/token`, {
      method: 'PUT',
      headers: { 'X-aws-ec2-metadata-token-ttl-seconds': '60' },
      signal: AbortSignal.timeout(800),
    });
    if (tokenRes.ok) {
      const token = await tokenRes.text();
      const get = async (path: string) => {
        const r = await fetch(`${base}/meta-data/${path}`, {
          headers: { 'X-aws-ec2-metadata-token': token },
          signal: AbortSignal.timeout(800),
        });
        return r.ok ? r.text() : null;
      };
      const [instanceId, instanceType, availabilityZone, region, publicIpv4] = await Promise.all([
        get('instance-id'),
        get('instance-type'),
        get('placement/availability-zone'),
        get('placement/region'),
        get('public-ipv4'),
      ]);
      if (instanceId) {
        value = {
          instanceId,
          instanceType: instanceType ?? 'unknown',
          availabilityZone: availabilityZone ?? 'unknown',
          region: region ?? 'unknown',
          publicIpv4,
        };
      }
    }
  } catch {
    value = null; // not running on EC2 (e.g. a laptop)
  }
  metadataCache = { value, at: Date.now() };
  return value;
}
