import type { Request, Response } from 'express';
import { LocalStorageService, storage } from '../services/storage';
import { AppError } from '../utils/errors';

/**
 * Serves files ONLY for the local development storage adapter, using a
 * short-lived signed token (the local stand-in for an S3 presigned URL).
 * When STORAGE_DRIVER=s3, downloads go straight to S3 via presigned URLs.
 */
export async function serveLocalFile(req: Request, res: Response) {
  if (!(storage instanceof LocalStorageService)) {
    throw new AppError(404, 'ROUTE_NOT_FOUND', 'API route not found');
  }
  const token = storage.verifyToken(String(req.params.token));
  const file = await storage.download(token.key);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `${token.disposition}; filename="${token.filename}"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Storage-Backend', 'LOCAL-DEVELOPMENT');
  res.send(file);
}
