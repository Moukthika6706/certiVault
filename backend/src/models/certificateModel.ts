import { db } from '../config/database';

export type CertificateStatus = 'ACTIVE' | 'REVOKED';
export type CertificateSource = 'GENERATED' | 'UPLOADED';
export type StorageBackend = 'S3' | 'LOCAL';

export interface CertificateRow {
  id: number;
  certificate_id: string;
  recipient_name: string;
  recipient_email: string | null;
  certificate_title: string;
  course_name: string;
  issuing_organization: string;
  issue_date: string;
  description: string | null;
  source: CertificateSource;
  status: CertificateStatus;
  storage_backend: StorageBackend;
  s3_object_key: string;
  storage_version_id: string | null;
  sha256_hash: string;
  file_size_bytes: number;
  verification_url: string;
  issued_by: number | null;
  revocation_reason: string | null;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
}

export type NewCertificate = Omit<
  CertificateRow,
  'id' | 'status' | 'revocation_reason' | 'created_at' | 'updated_at' | 'revoked_at'
>;

export function insertCertificate(input: NewCertificate): CertificateRow {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO certificates (
       certificate_id, recipient_name, recipient_email, certificate_title, course_name,
       issuing_organization, issue_date, description, source, status, storage_backend,
       s3_object_key, storage_version_id, sha256_hash, file_size_bytes, verification_url,
       issued_by, created_at, updated_at
     ) VALUES (
       @certificate_id, @recipient_name, @recipient_email, @certificate_title, @course_name,
       @issuing_organization, @issue_date, @description, @source, 'ACTIVE', @storage_backend,
       @s3_object_key, @storage_version_id, @sha256_hash, @file_size_bytes, @verification_url,
       @issued_by, @now, @now
     )`,
  ).run({ ...input, now });
  return findCertificateById(input.certificate_id)!;
}

export function findCertificateById(certificateId: string): CertificateRow | undefined {
  return db.prepare('SELECT * FROM certificates WHERE certificate_id = ?').get(certificateId) as
    | CertificateRow
    | undefined;
}

export function findCertificateByHash(sha256: string): CertificateRow | undefined {
  return db.prepare('SELECT * FROM certificates WHERE sha256_hash = ? ORDER BY id LIMIT 1').get(sha256) as
    | CertificateRow
    | undefined;
}

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export interface ListOptions {
  search?: string;
  status?: CertificateStatus;
  page: number;
  pageSize: number;
}

export function listCertificates(opts: ListOptions): { rows: CertificateRow[]; total: number } {
  const where: string[] = [];
  const params: Record<string, string | number> = {};

  if (opts.status) {
    where.push('status = @status');
    params.status = opts.status;
  }
  if (opts.search) {
    where.push(
      "(recipient_name LIKE @q ESCAPE '\\' OR certificate_id LIKE @q ESCAPE '\\' OR certificate_title LIKE @q ESCAPE '\\')",
    );
    params.q = `%${escapeLike(opts.search)}%`;
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) AS n FROM certificates ${whereSql}`).get(params) as { n: number }).n;
  const rows = db
    .prepare(`SELECT * FROM certificates ${whereSql} ORDER BY created_at DESC, id DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: opts.pageSize, offset: (opts.page - 1) * opts.pageSize }) as CertificateRow[];

  return { rows, total };
}

export function revokeCertificate(certificateId: string, reason: string | null): CertificateRow | undefined {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE certificates
        SET status = 'REVOKED', revoked_at = @now, updated_at = @now, revocation_reason = @reason
      WHERE certificate_id = @certificateId AND status = 'ACTIVE'`,
  ).run({ now, reason, certificateId });
  return findCertificateById(certificateId);
}

export function getCertificateStats() {
  const totals = db
    .prepare(
      `SELECT COUNT(*) AS total,
              COALESCE(SUM(status = 'ACTIVE'), 0)  AS active,
              COALESCE(SUM(status = 'REVOKED'), 0) AS revoked
         FROM certificates`,
    )
    .get() as { total: number; active: number; revoked: number };

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const sixMonthsAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5, 1));

  const issuedThisMonth = (
    db.prepare('SELECT COUNT(*) AS n FROM certificates WHERE created_at >= ?').get(monthStart.toISOString()) as {
      n: number;
    }
  ).n;

  const monthlyRows = db
    .prepare(
      `SELECT substr(created_at, 1, 7) AS month, COUNT(*) AS count
         FROM certificates
        WHERE created_at >= ?
        GROUP BY month`,
    )
    .all(sixMonthsAgo.toISOString()) as { month: string; count: number }[];

  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(Date.UTC(sixMonthsAgo.getUTCFullYear(), sixMonthsAgo.getUTCMonth() + i, 1));
    const key = d.toISOString().slice(0, 7);
    return { month: key, count: monthlyRows.find((r) => r.month === key)?.count ?? 0 };
  });

  const recent = db.prepare('SELECT * FROM certificates ORDER BY created_at DESC, id DESC LIMIT 5').all() as CertificateRow[];

  return { ...totals, issuedThisMonth, monthly, recent };
}
