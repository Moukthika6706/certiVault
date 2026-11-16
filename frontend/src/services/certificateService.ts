import { api } from './api';
import type {
  Admin,
  CertificateStatus,
  CertificateWithQr,
  Certificate,
  DashboardStats,
  FileCheckResponse,
  IntegrityResponse,
  IssueCertificatePayload,
  Paginated,
  SignedUrlResponse,
  StorageBackend,
  SystemInfo,
  VerifyResponse,
} from '../types';

// ── Auth ────────────────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const { data } = await api.post<{ token: string; admin: Admin }>('/auth/login', { email, password });
  return data;
}

export async function fetchCurrentAdmin() {
  const { data } = await api.get<{ admin: Admin }>('/auth/me');
  return data.admin;
}

// ── Admin: certificates ─────────────────────────────────────────────
export async function fetchCertificates(params: {
  search?: string;
  status?: CertificateStatus;
  page?: number;
  pageSize?: number;
}) {
  const { data } = await api.get<Paginated<Certificate>>('/certificates', { params });
  return data;
}

export async function fetchCertificate(certificateId: string) {
  const { data } = await api.get<CertificateWithQr>(`/certificates/${encodeURIComponent(certificateId)}`);
  return data;
}

export async function issueCertificate(payload: IssueCertificatePayload, file?: File | null) {
  const form = new FormData();
  Object.entries(payload).forEach(([key, value]) => form.append(key, value));
  if (payload.mode === 'upload' && file) form.append('file', file);
  const { data } = await api.post<CertificateWithQr>('/certificates', form);
  return data;
}

export async function revokeCertificate(certificateId: string, reason?: string) {
  const { data } = await api.patch<{ certificate: Certificate }>(
    `/certificates/${encodeURIComponent(certificateId)}/revoke`,
    { reason: reason || undefined },
  );
  return data.certificate;
}

export async function getAdminFileUrl(certificateId: string, disposition: 'inline' | 'attachment') {
  const { data } = await api.get<SignedUrlResponse>(
    `/certificates/${encodeURIComponent(certificateId)}/download-url`,
    { params: { disposition } },
  );
  return data;
}

export async function runAdminIntegrityCheck(certificateId: string) {
  const { data } = await api.get<IntegrityResponse>(`/certificates/${encodeURIComponent(certificateId)}/integrity`);
  return data;
}

export async function fetchDashboardStats() {
  const { data } = await api.get<DashboardStats>('/dashboard/stats');
  return data;
}

export async function fetchSystemInfo() {
  const { data } = await api.get<SystemInfo>('/system');
  return data;
}

export async function fetchHealth() {
  const { data } = await api.get<{ status: string; storage: StorageBackend }>('/health');
  return data;
}

// ── Public verification ─────────────────────────────────────────────
export async function verifyCertificate(certificateId: string) {
  const { data } = await api.get<VerifyResponse>(`/verify/${encodeURIComponent(certificateId.trim())}`);
  return data;
}

export async function getPublicFileUrl(certificateId: string, disposition: 'inline' | 'attachment') {
  const { data } = await api.get<SignedUrlResponse>(`/verify/${encodeURIComponent(certificateId)}/download-url`, {
    params: { disposition },
  });
  return data;
}

export async function runPublicIntegrityCheck(certificateId: string) {
  const { data } = await api.get<IntegrityResponse>(`/verify/${encodeURIComponent(certificateId)}/integrity`);
  return data;
}

export async function checkPdfFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<FileCheckResponse>('/verify/file', form);
  return data;
}

// ── Helpers ─────────────────────────────────────────────────────────
/** Opens a short-lived signed URL (S3 presigned URL, or the local-dev equivalent). */
export function openSignedUrl(url: string, mode: 'view' | 'download') {
  if (mode === 'view') {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
}
