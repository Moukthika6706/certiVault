export type CertificateStatus = 'ACTIVE' | 'REVOKED';
export type StorageBackend = 'S3' | 'LOCAL';

export interface Admin {
  id: number;
  name: string;
  email: string;
}

export interface Certificate {
  certificateId: string;
  recipientName: string;
  recipientEmail: string | null;
  certificateTitle: string;
  courseName: string;
  issuingOrganization: string;
  issueDate: string;
  description: string | null;
  source: 'GENERATED' | 'UPLOADED';
  status: CertificateStatus;
  storage: {
    backend: StorageBackend;
    objectKey: string;
    versionId: string | null;
    sizeBytes: number;
  };
  sha256Hash: string;
  verificationUrl: string;
  revocationReason: string | null;
  createdAt: string;
  updatedAt: string;
  revokedAt: string | null;
}

export interface CertificateWithQr {
  certificate: Certificate;
  qrCodeDataUrl: string;
}

export interface PublicCertificate {
  certificateId: string;
  recipientName: string;
  certificateTitle: string;
  courseName: string;
  issuingOrganization: string;
  issueDate: string;
  description: string | null;
  status: CertificateStatus;
  sha256Hash: string;
  issuedAt: string;
  revokedAt: string | null;
}

export type VerificationResult = 'VERIFIED' | 'REVOKED' | 'NOT_FOUND';

export interface VerifyResponse {
  result: VerificationResult;
  certificate: PublicCertificate | null;
  checkedAt: string;
}

export interface FileCheckResponse {
  result: 'AUTHENTIC' | 'AUTHENTIC_REVOKED' | 'NO_MATCH';
  sha256Hash: string;
  certificate: PublicCertificate | null;
  checkedAt: string;
}

export interface IntegrityResponse {
  certificateId: string;
  match: boolean;
  storedHash: string;
  computedHash: string;
  sizeBytes?: number;
  checkedAt: string;
}

export interface SignedUrlResponse {
  url: string;
  expiresInSeconds: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface DashboardStats {
  total: number;
  active: number;
  revoked: number;
  issuedThisMonth: number;
  monthly: { month: string; count: number }[];
  recent: Certificate[];
  storageBackend: StorageBackend;
}

export interface SystemInfo {
  app: {
    name: string;
    version: string;
    environment: string;
    nodeVersion: string;
    startedAt: string;
    uptimeSeconds: number;
    publicAppUrl: string;
  };
  storage: {
    backend: StorageBackend;
    description: string;
    bucket: string | null;
    region: string | null;
    healthy: boolean;
    message: string;
  };
  iam: {
    identity: { arn: string; account: string; roleName: string | null } | null;
    error: string | null;
  };
  ec2: {
    instanceId: string;
    instanceType: string;
    availabilityZone: string;
    region: string;
    publicIpv4: string | null;
  } | null;
  consoleLinks: { ec2: string; s3: string; iam: string; cloudwatch: string };
}

export interface IssueCertificatePayload {
  mode: 'generate' | 'upload';
  recipientName: string;
  recipientEmail: string;
  certificateTitle: string;
  courseName: string;
  issuingOrganization: string;
  issueDate: string;
  description: string;
}
