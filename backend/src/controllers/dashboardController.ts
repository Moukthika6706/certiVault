import type { Request, Response } from 'express';
import { toAdminCertificate } from '../models/certificateMapper';
import { getCertificateStats } from '../models/certificateModel';
import { storage } from '../services/storage';

export function stats(_req: Request, res: Response) {
  const s = getCertificateStats();
  res.json({
    total: s.total,
    active: s.active,
    revoked: s.revoked,
    issuedThisMonth: s.issuedThisMonth,
    monthly: s.monthly,
    recent: s.recent.map(toAdminCertificate),
    storageBackend: storage.backend,
  });
}
