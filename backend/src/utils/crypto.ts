import { createHash } from 'crypto';

export function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

const PDF_MAGIC = Buffer.from('%PDF-');

/** Checks the file signature, not just the client-supplied MIME type. */
export function looksLikePdf(data: Buffer): boolean {
  if (data.length < PDF_MAGIC.length) return false;
  // Some generators prepend a few bytes before the header; spec allows it within the first 1024 bytes.
  return data.subarray(0, 1024).includes(PDF_MAGIC);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function normalizeCertificateId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const id = raw.trim().toLowerCase();
  return UUID_RE.test(id) ? id : null;
}
