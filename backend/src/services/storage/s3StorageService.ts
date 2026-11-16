import {
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AppError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import type { SignedUrlOptions, StorageHealth, StorageService, StoredObject } from './types';

/**
 * Amazon S3 implementation.
 *
 * Credentials: none are configured here on purpose. The SDK uses its default
 * credential provider chain, which on EC2 resolves to the temporary credentials
 * of the IAM role attached to the instance (via the instance metadata service).
 */
export class S3StorageService implements StorageService {
  readonly backend = 'S3' as const;
  readonly description: string;
  private readonly client: S3Client;

  constructor(
    private readonly bucket: string,
    region: string,
    private readonly presignTtlSeconds: number,
  ) {
    this.client = new S3Client({ region });
    this.description = `Amazon S3 bucket "${bucket}" (${region})`;
  }

  async upload(key: string, body: Buffer, metadata: Record<string, string>): Promise<StoredObject> {
    try {
      const result = await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: 'application/pdf',
          ServerSideEncryption: 'AES256', // SSE-S3 (also enforced by the bucket's default encryption)
          Metadata: metadata,
        }),
      );
      return { key, versionId: result.VersionId ?? null, backend: this.backend };
    } catch (err) {
      throw this.translate(err, 'upload');
    }
  }

  async download(key: string): Promise<Buffer> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
      if (!result.Body) throw new AppError(502, 'STORAGE_EMPTY', 'Storage returned an empty object');
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (err) {
      throw this.translate(err, 'download');
    }
  }

  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: 'application/pdf',
      ResponseContentDisposition: `${options.disposition}; filename="${options.filename}"`,
    });
    return getSignedUrl(this.client, command, { expiresIn: this.presignTtlSeconds });
  }

  async checkHealth(): Promise<StorageHealth> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return { ok: true, message: `Connected to ${this.description}` };
    } catch (err) {
      const name = err instanceof Error ? err.name : 'UnknownError';
      return { ok: false, message: `Cannot reach S3 bucket "${this.bucket}": ${name}` };
    }
  }

  private translate(err: unknown, action: string): Error {
    if (err instanceof AppError) return err;
    const name = err instanceof Error ? err.name : 'UnknownError';
    logger.error(`S3 ${action} failed (${name})`, err instanceof S3ServiceException ? err.message : err);

    if (name === 'NoSuchKey' || name === 'NotFound') {
      return new AppError(404, 'OBJECT_NOT_FOUND', 'The certificate file was not found in storage');
    }
    if (name === 'AccessDenied' || name === 'Forbidden') {
      return new AppError(502, 'STORAGE_ACCESS_DENIED', 'The server is not authorised to access certificate storage');
    }
    if (name === 'CredentialsProviderError') {
      return new AppError(502, 'STORAGE_NO_CREDENTIALS', 'The server has no AWS credentials (is the IAM role attached?)');
    }
    return new AppError(502, 'STORAGE_ERROR', `Certificate storage ${action} failed`);
  }
}
