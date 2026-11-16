import type { CertificateRow } from './certificateModel';

/** Full record for authenticated administrators. */
export function toAdminCertificate(row: CertificateRow) {
  return {
    certificateId: row.certificate_id,
    recipientName: row.recipient_name,
    recipientEmail: row.recipient_email,
    certificateTitle: row.certificate_title,
    courseName: row.course_name,
    issuingOrganization: row.issuing_organization,
    issueDate: row.issue_date,
    description: row.description,
    source: row.source,
    status: row.status,
    storage: {
      backend: row.storage_backend,
      objectKey: row.s3_object_key,
      versionId: row.storage_version_id,
      sizeBytes: row.file_size_bytes,
    },
    sha256Hash: row.sha256_hash,
    verificationUrl: row.verification_url,
    revocationReason: row.revocation_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    revokedAt: row.revoked_at,
  };
}

/**
 * What anyone on the internet may see when verifying a certificate.
 * Deliberately excludes recipient email, storage keys and internal IDs.
 */
export function toPublicCertificate(row: CertificateRow) {
  return {
    certificateId: row.certificate_id,
    recipientName: row.recipient_name,
    certificateTitle: row.certificate_title,
    courseName: row.course_name,
    issuingOrganization: row.issuing_organization,
    issueDate: row.issue_date,
    description: row.description,
    status: row.status,
    sha256Hash: row.sha256_hash,
    issuedAt: row.created_at,
    revokedAt: row.revoked_at,
  };
}
