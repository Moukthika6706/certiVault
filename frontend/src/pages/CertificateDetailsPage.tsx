import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Ban,
  ChevronLeft,
  CircleCheck,
  CircleX,
  Download,
  ExternalLink,
  Eye,
  FileText,
  FingerprintPattern,
  HardDrive,
  QrCode,
  SearchX,
  ShieldBan,
} from 'lucide-react';
import { RevokeDialog } from '../components/RevokeDialog';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  CopyButton,
  DetailRow,
  EmptyState,
  FullPageSpinner,
  Skeleton,
  StatusBadge,
  StorageBadge,
} from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn, formatBytes, formatDate, formatDateTime } from '../lib/format';
import { getErrorMessage } from '../services/api';
import { fetchCertificate, getAdminFileUrl, openSignedUrl, runAdminIntegrityCheck } from '../services/certificateService';
import type { CertificateWithQr, IntegrityResponse } from '../types';

export function CertificateDetailsPage() {
  const { certificateId = '' } = useParams();
  const toast = useToast();
  const [data, setData] = useState<CertificateWithQr | null>(null);
  const [error, setError] = useState<{ message: string; notFound: boolean } | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [busy, setBusy] = useState<'view' | 'download' | null>(null);
  const [preview, setPreview] = useState<{ url?: string; error?: string; loading: boolean }>({ loading: true });
  const [integrity, setIntegrity] = useState<{ loading: boolean; result?: IntegrityResponse; error?: string }>({ loading: false });

  useDocumentTitle(data ? data.certificate.recipientName : 'Certificate');

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    fetchCertificate(certificateId)
      .then((d) => !cancelled && setData(d))
      .catch((err) => {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } }).response?.status;
        setError({ message: getErrorMessage(err), notFound: status === 404 });
      });
    return () => {
      cancelled = true;
    };
  }, [certificateId]);

  // Load an inline presigned URL for the embedded PDF preview.
  useEffect(() => {
    if (!data) return;
    let cancelled = false;
    setPreview({ loading: true });
    getAdminFileUrl(data.certificate.certificateId, 'inline')
      .then(({ url }) => !cancelled && setPreview({ url, loading: false }))
      .catch((err) => !cancelled && setPreview({ loading: false, error: getErrorMessage(err) }));
    return () => {
      cancelled = true;
    };
  }, [data?.certificate.certificateId]); // eslint-disable-line react-hooks/exhaustive-deps

  const openFile = async (mode: 'view' | 'download') => {
    setBusy(mode);
    try {
      const { url } = await getAdminFileUrl(certificateId, mode === 'view' ? 'inline' : 'attachment');
      openSignedUrl(url, mode);
    } catch (err) {
      toast.error('Could not open the PDF', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const checkIntegrity = async () => {
    setIntegrity({ loading: true });
    try {
      setIntegrity({ loading: false, result: await runAdminIntegrityCheck(certificateId) });
    } catch (err) {
      setIntegrity({ loading: false, error: getErrorMessage(err) });
    }
  };

  if (error) {
    return (
      <Card>
        <EmptyState
          icon={<SearchX className="size-6" />}
          title={error.notFound ? 'Certificate not found' : 'Couldn’t load certificate'}
          description={error.notFound ? 'No certificate exists with this ID.' : error.message}
          action={<ButtonLink to="/admin/certificates" variant="secondary" size="sm">Back to certificates</ButtonLink>}
        />
      </Card>
    );
  }
  if (!data) return <FullPageSpinner />;

  const c = data.certificate;
  const revoked = c.status === 'REVOKED';

  return (
    <>
      <Link to="/admin/certificates" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
        <ChevronLeft className="size-4" /> All certificates
      </Link>

      <div className="mt-4 mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight break-words text-slate-900 sm:text-[28px]">{c.recipientName}</h1>
            <StatusBadge status={c.status} />
          </div>
          <p className="mt-1.5 text-[15px] text-slate-500">
            {c.certificateTitle} · {c.courseName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => openFile('view')} loading={busy === 'view'} icon={<Eye className="size-4" />}>
            View PDF
          </Button>
          <Button variant="secondary" onClick={() => openFile('download')} loading={busy === 'download'} icon={<Download className="size-4" />}>
            Download
          </Button>
          {!revoked && (
            <Button variant="danger" onClick={() => setRevokeOpen(true)} icon={<Ban className="size-4" />}>
              Revoke
            </Button>
          )}
        </div>
      </div>

      {revoked && (
        <Alert tone="warning" title={`Revoked on ${formatDateTime(c.revokedAt)}`} icon={<ShieldBan className="size-4" />} className="mb-6">
          {c.revocationReason ? `Reason: ${c.revocationReason}` : 'No reason recorded.'} Public verification returns REVOKED and downloads are disabled for the public.
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <Card>
            <CardHeader title="Certificate information" icon={<FileText className="size-4" />} />
            <dl className="divide-y divide-slate-100 px-5 sm:px-6">
              <DetailRow label="Certificate ID" mono>
                <span className="inline-flex flex-wrap items-center gap-1 break-all">
                  {c.certificateId}
                  <CopyButton value={c.certificateId} iconOnly label="Copy ID" toastMessage="Certificate ID copied" />
                </span>
              </DetailRow>
              <DetailRow label="Recipient">{c.recipientName}</DetailRow>
              <DetailRow label="Recipient email">{c.recipientEmail ?? <span className="text-slate-400">Not provided</span>}</DetailRow>
              <DetailRow label="Certificate title">{c.certificateTitle}</DetailRow>
              <DetailRow label="Course / program">{c.courseName}</DetailRow>
              <DetailRow label="Issuing organization">{c.issuingOrganization}</DetailRow>
              <DetailRow label="Issue date">{formatDate(c.issueDate, 'long')}</DetailRow>
              {c.description && <DetailRow label="Description">{c.description}</DetailRow>}
              <DetailRow label="Source">{c.source === 'GENERATED' ? 'Generated from CertiVault template' : 'Uploaded PDF'}</DetailRow>
              <DetailRow label="Recorded">{formatDateTime(c.createdAt)}</DetailRow>
            </dl>
          </Card>

          <Card>
            <CardHeader
              title="Storage & integrity"
              icon={<HardDrive className="size-4" />}
              description="Where the PDF lives and proof it hasn't changed."
            />
            <dl className="divide-y divide-slate-100 px-5 sm:px-6">
              <DetailRow label="Storage backend">
                <StorageBadge backend={c.storage.backend} />
              </DetailRow>
              <DetailRow label="Object key" mono>{c.storage.objectKey}</DetailRow>
              <DetailRow label="S3 version ID" mono>
                {c.storage.versionId ?? <span className="font-sans text-slate-400">—</span>}
              </DetailRow>
              <DetailRow label="File size">{formatBytes(c.storage.sizeBytes)}</DetailRow>
              <DetailRow label="SHA-256 (recorded)" mono>
                <span className="text-[12px]">{c.sha256Hash}</span>
              </DetailRow>
            </dl>
            <div className="border-t border-slate-100 p-5 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FingerprintPattern className="mt-0.5 size-5 text-brand-700" />
                  <p className="text-sm text-slate-600">
                    Download the object from storage, recompute its SHA-256 and compare it with the recorded hash.
                  </p>
                </div>
                <Button variant="subtle" size="sm" onClick={checkIntegrity} loading={integrity.loading}>
                  Run integrity check
                </Button>
              </div>
              {integrity.error && <p className="mt-3 text-sm text-red-600">{integrity.error}</p>}
              {integrity.result && (
                <div
                  className={cn(
                    'mt-4 animate-fade-in rounded-lg p-3 text-sm',
                    integrity.result.match ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-900',
                  )}
                >
                  <p className="flex items-center gap-2 font-medium">
                    {integrity.result.match ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
                    {integrity.result.match ? 'Integrity verified — stored file matches the recorded hash' : 'Mismatch — the stored file differs from the recorded hash'}
                  </p>
                  <p className="mt-1.5 font-mono text-[11px] break-all opacity-75">computed {integrity.result.computedHash}</p>
                  <p className="mt-0.5 text-xs opacity-60">Checked {formatDateTime(integrity.result.checkedAt)}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Document preview" icon={<Eye className="size-4" />} description="Delivered through a short-lived signed URL." />
            <div className="p-3 sm:p-4">
              {preview.loading ? (
                <Skeleton className="aspect-[1.414] w-full rounded-lg" />
              ) : preview.error ? (
                <Alert tone="error" title="Preview unavailable">{preview.error}</Alert>
              ) : (
                <iframe
                  src={`${preview.url}#toolbar=0&view=FitH`}
                  title="Certificate PDF preview"
                  className="aspect-[1.3] w-full rounded-lg border border-slate-200 bg-slate-100"
                />
              )}
            </div>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader title="Verification" icon={<QrCode className="size-4" />} />
            <div className="p-5">
              <div className="rounded-xl border border-slate-200 p-3">
                <img src={data.qrCodeDataUrl} alt="Verification QR code" className="mx-auto aspect-square w-full max-w-[220px]" />
              </div>
              <p className="mt-4 text-xs font-medium tracking-wide text-slate-500 uppercase">Public link</p>
              <p className="mt-1 text-[13px] break-all text-brand-700">{c.verificationUrl}</p>
              <div className="mt-4 grid gap-2">
                <CopyButton value={c.verificationUrl} label="Copy verification link" toastMessage="Verification link copied" className="justify-center ring-1 ring-slate-200 ring-inset py-2" />
                <a
                  href={c.verificationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium text-slate-500 ring-1 ring-slate-200 ring-inset hover:bg-slate-100 hover:text-slate-900"
                >
                  <ExternalLink className="size-3.5" /> Open verification page
                </a>
                <a
                  href={data.qrCodeDataUrl}
                  download={`CertiVault-QR-${c.certificateId}.png`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-[13px] font-medium text-slate-500 ring-1 ring-slate-200 ring-inset hover:bg-slate-100 hover:text-slate-900"
                >
                  <Download className="size-3.5" /> Save QR code
                </a>
              </div>
            </div>
          </Card>
        </aside>
      </div>

      <RevokeDialog
        certificate={revokeOpen ? c : null}
        onClose={() => setRevokeOpen(false)}
        onRevoked={(updated) => setData((d) => d && { ...d, certificate: updated })}
      />
    </>
  );
}
