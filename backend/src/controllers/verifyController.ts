import type { Request, Response } from 'express';
import { toPublicCertificate } from '../models/certificateMapper';
import { findCertificateByHash, findCertificateById } from '../models/certificateModel';
import { checkIntegrity, getCertificateDownloadUrl, requireCertificate } from '../services/certificateService';
import { AppError } from '../utils/errors';
import { looksLikePdf, normalizeCertificateId, sha256Hex } from '../utils/crypto';

/**
 * Public verification. The result is always computed from the database —
 * a QR code or a PDF on its own proves nothing.
 *   VERIFIED  → certificate exists and is ACTIVE
 *   REVOKED   → certificate exists but was revoked by an administrator
 *   NOT_FOUND → no certificate with this ID (never stored; generated here)
 */
export function verify(req: Request, res: Response) {
  const id = normalizeCertificateId(req.params.certificateId);
  const row = id ? findCertificateById(id) : undefined;
  const checkedAt = new Date().toISOString();

  if (!row) {
    return res.json({ result: 'NOT_FOUND', certificate: null, checkedAt });
  }
  res.json({
    result: row.status === 'ACTIVE' ? 'VERIFIED' : 'REVOKED',
    certificate: toPublicCertificate(row),
    checkedAt,
  });
}

export async function publicDownloadUrl(req: Request, res: Response) {
  const row = requireCertificate(normalizeCertificateId(req.params.certificateId));
  if (row.status !== 'ACTIVE') {
    throw new AppError(403, 'CERTIFICATE_REVOKED', 'Revoked certificates cannot be downloaded');
  }
  const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';
  res.json(await getCertificateDownloadUrl(row, disposition));
}

export async function publicIntegrity(req: Request, res: Response) {
  const row = requireCertificate(normalizeCertificateId(req.params.certificateId));
  const { match, storedHash, computedHash, checkedAt } = await checkIntegrity(row);
  res.json({ certificateId: row.certificate_id, match, storedHash, computedHash, checkedAt });
}

/**
 * "I have a PDF — is it genuine?"  Hashes the uploaded file and looks the hash
 * up in the database. Any modification to the file changes the SHA-256.
 */
export function verifyFile(req: Request, res: Response) {
  if (!req.file) throw new AppError(400, 'FILE_REQUIRED', 'Please choose a PDF file to check');
  if (!looksLikePdf(req.file.buffer)) throw new AppError(400, 'INVALID_FILE', 'The selected file is not a valid PDF');

  const sha256Hash = sha256Hex(req.file.buffer);
  const row = findCertificateByHash(sha256Hash);
  const checkedAt = new Date().toISOString();

  if (!row) {
    return res.json({ result: 'NO_MATCH', sha256Hash, certificate: null, checkedAt });
  }
  res.json({
    result: row.status === 'ACTIVE' ? 'AUTHENTIC' : 'AUTHENTIC_REVOKED',
    sha256Hash,
    certificate: toPublicCertificate(row),
    checkedAt,
  });
}
