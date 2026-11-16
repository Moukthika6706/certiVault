import type { StorageBackend } from '../../models/certificateModel';

export interface StoredObject {
  key: string;
  versionId: string | null;
  backend: StorageBackend;
}

export interface SignedUrlOptions {
  /** File name the browser should use when saving. */
  filename: string;
  /** `inline` opens in the browser's PDF viewer, `attachment` downloads. */
  disposition: 'inline' | 'attachment';
}

export interface StorageHealth {
  ok: boolean;
  message: string;
}

/**
 * Abstraction over where certificate PDFs live.
 *   - S3StorageService     → Amazon S3 (production / the AWS demonstration)
 *   - LocalStorageService  → a folder on disk, ONLY for offline local development
 */
export interface StorageService {
  readonly backend: StorageBackend;
  readonly description: string;
  upload(key: string, body: Buffer, metadata: Record<string, string>): Promise<StoredObject>;
  download(key: string): Promise<Buffer>;
  getSignedUrl(key: string, options: SignedUrlOptions): Promise<string>;
  checkHealth(): Promise<StorageHealth>;
}
