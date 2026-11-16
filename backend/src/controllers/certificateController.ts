import type { Request, Response } from 'express';
import { toAdminCertificate } from '../models/certificateMapper';
import { listCertificates, revokeCertificate } from '../models/certificateModel';
import {
  checkIntegrity,
  getCertificateDownloadUrl,
  issueCertificate,
  requireCertificate,
} from '../services/certificateService';
import { generateQrDataUrl } from '../services/qrService';
import { AppError } from '../utils/errors';
import { normalizeCertificateId } from '../utils/crypto';
import { issueCertificateSchema, listQuerySchema, revokeSchema } from '../utils/validation';

export function list(req: Request, res: Response) {
  const query = listQuerySchema.parse(req.query);
  const { rows, total } = listCertificates(query);
  res.json({
    items: rows.map(toAdminCertificate),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  });
}

export async function create(req: Request, res: Response) {
  const input = issueCertificateSchema.parse(req.body ?? {});
  const row = await issueCertificate(input, req.file?.buffer, req.admin!.id);
  res.status(201).json({
    certificate: toAdminCertificate(row),
    qrCodeDataUrl: await generateQrDataUrl(row.verification_url),
  });
}

export async function getOne(req: Request, res: Response) {
  const row = requireCertificate(normalizeCertificateId(req.params.certificateId));
  res.json({
    certificate: toAdminCertificate(row),
    qrCodeDataUrl: await generateQrDataUrl(row.verification_url),
  });
}

export async function downloadUrl(req: Request, res: Response) {
  const row = requireCertificate(normalizeCertificateId(req.params.certificateId));
  const disposition = req.query.disposition === 'inline' ? 'inline' : 'attachment';
  res.json(await getCertificateDownloadUrl(row, disposition));
}

export async function integrity(req: Request, res: Response) {
  const row = requireCertificate(normalizeCertificateId(req.params.certificateId));
  res.json({ certificateId: row.certificate_id, ...(await checkIntegrity(row)) });
}

export function revoke(req: Request, res: Response) {
  const row = requireCertificate(normalizeCertificateId(req.params.certificateId));
  if (row.status === 'REVOKED') {
    throw new AppError(409, 'ALREADY_REVOKED', 'This certificate has already been revoked');
  }
  const { reason } = revokeSchema.parse(req.body ?? {});
  const updated = revokeCertificate(row.certificate_id, reason)!;
  res.json({ certificate: toAdminCertificate(updated) });
}
