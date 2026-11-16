import fs from 'fs/promises';
import path from 'path';
import jwt from 'jsonwebtoken';
import { AppError } from '../../utils/errors';
import type { SignedUrlOptions, StorageHealth, StorageService, StoredObject } from './types';

export interface LocalFileToken {
  purpose: 'local-file';
  key: string;
  filename: string;
  disposition: 'inline' | 'attachment';
}

/**
 * DEVELOPMENT-ONLY storage adapter.
 *
 * Writes PDFs to a folder on the developer's machine so the app can be built
 * and tested before AWS is configured. It is clearly labelled as local in the
 * API, the UI and the database (storage_backend = 'LOCAL') and must never be
 * presented as Amazon S3.
 */
export class LocalStorageService implements StorageService {
  readonly backend = 'LOCAL' as const;
  readonly description: string;

  constructor(
    private readonly baseDir: string,
    private readonly signingSecret: string,
    private readonly ttlSeconds: number,
  ) {
    this.description = `Local development folder (${baseDir}) — NOT Amazon S3`;
  }

  resolvePath(key: string): string {
    const full = path.resolve(this.baseDir, ...key.split('/'));
    if (!full.startsWith(path.resolve(this.baseDir) + path.sep)) {
      throw new AppError(400, 'INVALID_KEY', 'Invalid storage key');
    }
    return full;
  }

  async upload(key: string, body: Buffer, metadata: Record<string, string>): Promise<StoredObject> {
    const target = this.resolvePath(key);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, body);
    await fs.writeFile(`${target}.meta.json`, JSON.stringify(metadata, null, 2));
    return { key, versionId: null, backend: this.backend };
  }

  async download(key: string): Promise<Buffer> {
    try {
      return await fs.readFile(this.resolvePath(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new AppError(404, 'OBJECT_NOT_FOUND', 'The certificate file was not found in storage');
      }
      throw err;
    }
  }

  /** Mimics an S3 presigned URL: a short-lived signed token served by /api/files/:token. */
  async getSignedUrl(key: string, options: SignedUrlOptions): Promise<string> {
    const payload: LocalFileToken = { purpose: 'local-file', key, ...options };
    const token = jwt.sign(payload, this.signingSecret, { expiresIn: this.ttlSeconds });
    return `/api/files/${token}`;
  }

  verifyToken(token: string): LocalFileToken {
    try {
      const decoded = jwt.verify(token, this.signingSecret) as LocalFileToken;
      if (decoded.purpose !== 'local-file') throw new Error('wrong purpose');
      return decoded;
    } catch {
      throw new AppError(403, 'LINK_EXPIRED', 'This download link is invalid or has expired');
    }
  }

  async checkHealth(): Promise<StorageHealth> {
    try {
      await fs.mkdir(this.baseDir, { recursive: true });
      await fs.access(this.baseDir, fs.constants.W_OK);
      return { ok: true, message: 'Local development storage is writable (not AWS)' };
    } catch {
      return { ok: false, message: `Local storage folder is not writable: ${this.baseDir}` };
    }
  }
}
