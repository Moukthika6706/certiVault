import { randomUUID } from 'crypto';
import { config } from '../config/env';
import {
  findCertificateByHash,
  findCertificateById,
  insertCertificate,
  type CertificateRow,
} from '../models/certificateModel';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { looksLikePdf, sha256Hex } from '../utils/crypto';
import { generateCertificatePdf } from './pdfService';
import { generateQrPng } from './qrService';
import { storage } from './storage';

export interface IssueCertificateInput {
  mode: 'generate' | 'upload';
  recipientName: string;
  recipientEmail: string | null;
  certificateTitle: string;
  courseName: string;
  issuingOrganization: string;
  issueDate: string;
  description: string | null;
}

export function buildVerificationUrl(certificateId: string): string {
  return `${config.publicAppUrl}/verify/${certificateId}`;
}

export function buildObjectKey(certificateId: string, issueDate: string): string {
  // "certificates/2026/<uuid>.pdf" — S3 has no real folders; "certificates/2026/" is a key prefix.
  return `certificates/${issueDate.slice(0, 4)}/${certificateId}.pdf`;
}

export function downloadFileName(certificateId: string): string {
  return `CertiVault-${certificateId}.pdf`;
}

/**
 * Issuance workflow:
 *   1. (input already validated by the controller)
 *   2. generate UUID certificate ID     3. build verification URL
 *   4. generate QR code                  5. generate or accept the PDF
 *   6. SHA-256 the final PDF             7. upload to S3
 *   8–9. store metadata + S3 key in SQLite   10. return the record
 */
export async function issueCertificate(
  input: IssueCertificateInput,
  uploadedPdf: Buffer | undefined,
  adminId: number,
): Promise<CertificateRow> {
  const certificateId = randomUUID();
  const verificationUrl = buildVerificationUrl(certificateId);
  const qrPng = await generateQrPng(verificationUrl);

  let pdf: Buffer;
  if (input.mode === 'generate') {
    pdf = await generateCertificatePdf({ ...input, certificateId, verificationUrl, qrPng });
  } else {
    if (!uploadedPdf) throw new AppError(400, 'FILE_REQUIRED', 'Please attach the certificate PDF to upload');
    if (!looksLikePdf(uploadedPdf)) throw new AppError(400, 'INVALID_FILE', 'The uploaded file is not a valid PDF');
    pdf = uploadedPdf;
  }

  const sha256Hash = sha256Hex(pdf);
  const duplicate = findCertificateByHash(sha256Hash);
  if (duplicate) {
    throw new AppError(
      409,
      'DUPLICATE_FILE',
      `This exact PDF is already registered as certificate ${duplicate.certificate_id}`,
    );
  }

  const key = buildObjectKey(certificateId, input.issueDate);
  const stored = await storage.upload(key, pdf, {
    'certificate-id': certificateId,
    sha256: sha256Hash,
    source: input.mode === 'generate' ? 'generated' : 'uploaded',
  });
  logger.info(`Stored ${key} in ${stored.backend}${stored.versionId ? ` (version ${stored.versionId})` : ''}`);

  return insertCertificate({
    certificate_id: certificateId,
    recipient_name: input.recipientName,
    recipient_email: input.recipientEmail,
    certificate_title: input.certificateTitle,
    course_name: input.courseName,
    issuing_organization: input.issuingOrganization,
    issue_date: input.issueDate,
    description: input.description,
    source: input.mode === 'generate' ? 'GENERATED' : 'UPLOADED',
    storage_backend: stored.backend,
    s3_object_key: stored.key,
    storage_version_id: stored.versionId,
    sha256_hash: sha256Hash,
    file_size_bytes: pdf.length,
    verification_url: verificationUrl,
    issued_by: adminId,
  });
}

function assertSameBackend(row: CertificateRow) {
  if (row.storage_backend !== storage.backend) {
    throw new AppError(
      409,
      'STORAGE_MISMATCH',
      `This certificate's file is in ${row.storage_backend} storage, but the server is currently using ${storage.backend}.`,
    );
  }
}

export async function getCertificateDownloadUrl(row: CertificateRow, disposition: 'inline' | 'attachment') {
  assertSameBackend(row);
  const url = await storage.getSignedUrl(row.s3_object_key, {
    filename: downloadFileName(row.certificate_id),
    disposition,
  });
  return { url, expiresInSeconds: config.presignedUrlTtlSeconds };
}

/** Re-downloads the stored PDF and compares its SHA-256 with the hash recorded at issuance. */
export async function checkIntegrity(row: CertificateRow) {
  assertSameBackend(row);
  const file = await storage.download(row.s3_object_key);
  const computedHash = sha256Hex(file);
  return {
    match: computedHash === row.sha256_hash,
    storedHash: row.sha256_hash,
    computedHash,
    sizeBytes: file.length,
    checkedAt: new Date().toISOString(),
  };
}

export function requireCertificate(certificateId: string | null): CertificateRow {
  const row = certificateId ? findCertificateById(certificateId) : undefined;
  if (!row) throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found');
  return row;
}
