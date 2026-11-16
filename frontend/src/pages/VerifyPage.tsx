import { useCallback, useEffect, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Building,
  Calendar,
  CircleCheck,
  CircleX,
  Download,
  Eye,
  FileSearch,
  FileText,
  FingerprintPattern,
  Hash,
  Info,
  Search,
  SearchX,
  ShieldBan,
  ShieldCheck,
  Upload,
  User,
  Award,
} from 'lucide-react';
import { Alert, Button, CopyButton, Spinner, StatusBadge } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn, extractCertificateId, formatBytes, formatDate, formatDateTime, isCertificateId } from '../lib/format';
import { getErrorMessage } from '../services/api';
import {
  checkPdfFile,
  getPublicFileUrl,
  openSignedUrl,
  runPublicIntegrityCheck,
  verifyCertificate,
} from '../services/certificateService';
import type { FileCheckResponse, IntegrityResponse, PublicCertificate, VerifyResponse } from '../types';

type Tab = 'id' | 'file';

const RESULT_STYLES = {
  VERIFIED: {
    band: 'bg-emerald-50 border-emerald-200',
    iconWrap: 'bg-emerald-600 text-white',
    icon: CircleCheck,
    title: 'Certificate Verified Successfully',
    titleColor: 'text-emerald-900',
  },
  REVOKED: {
    band: 'bg-amber-50 border-amber-200',
    iconWrap: 'bg-amber-500 text-white',
    icon: ShieldBan,
    title: 'Certificate Revoked',
    titleColor: 'text-amber-900',
  },
  NOT_FOUND: {
    band: 'bg-red-50 border-red-200',
    iconWrap: 'bg-red-600 text-white',
    icon: SearchX,
    title: 'Certificate Not Found',
    titleColor: 'text-red-900',
  },
} as const;

function DetailItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-slate-400">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
        <dd className="mt-1 text-[15px] break-words text-slate-900">{children}</dd>
      </div>
    </div>
  );
}

function CertificateDetails({ certificate }: { certificate: PublicCertificate }) {
  return (
    <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      <DetailItem icon={<User className="size-4" />} label="Recipient">
        <span className="font-semibold">{certificate.recipientName}</span>
      </DetailItem>
      <DetailItem icon={<Award className="size-4" />} label="Certificate">
        {certificate.certificateTitle}
      </DetailItem>
      <DetailItem icon={<FileText className="size-4" />} label="Course / program">
        {certificate.courseName}
      </DetailItem>
      <DetailItem icon={<Building className="size-4" />} label="Issuing organization">
        {certificate.issuingOrganization}
      </DetailItem>
      <DetailItem icon={<Calendar className="size-4" />} label="Issue date">
        {formatDate(certificate.issueDate, 'long')}
      </DetailItem>
      <DetailItem icon={<ShieldCheck className="size-4" />} label="Current status">
        <StatusBadge status={certificate.status} />
        {certificate.revokedAt && (
          <span className="mt-1 block text-sm text-slate-500">Revoked on {formatDateTime(certificate.revokedAt)}</span>
        )}
      </DetailItem>
      <div className="sm:col-span-2">
        <DetailItem icon={<Hash className="size-4" />} label="Certificate ID">
          <span className="flex flex-wrap items-center gap-1">
            <code className="font-mono text-sm">{certificate.certificateId}</code>
            <CopyButton value={certificate.certificateId} iconOnly label="Copy certificate ID" toastMessage="Certificate ID copied" />
          </span>
        </DetailItem>
      </div>
      {certificate.description && (
        <div className="sm:col-span-2">
          <DetailItem icon={<Info className="size-4" />} label="Description">
            <span className="text-slate-600">{certificate.description}</span>
          </DetailItem>
        </div>
      )}
    </dl>
  );
}

function IntegrityPanel({ certificateId }: { certificateId: string }) {
  const [state, setState] = useState<{ loading: boolean; data?: IntegrityResponse; error?: string }>({ loading: false });

  const run = async () => {
    setState({ loading: true });
    try {
      setState({ loading: false, data: await runPublicIntegrityCheck(certificateId) });
    } catch (err) {
      setState({ loading: false, error: getErrorMessage(err) });
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <FingerprintPattern className="mt-0.5 size-5 text-brand-700" />
          <div>
            <p className="text-sm font-medium text-slate-900">Stored file integrity</p>
            <p className="text-[13px] text-slate-500">Re-hash the stored PDF and compare it with the SHA-256 recorded at issuance.</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={run} loading={state.loading}>
          {state.data ? 'Run again' : 'Run check'}
        </Button>
      </div>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state.data && (
        <div className="mt-4 animate-fade-in space-y-2 border-t border-slate-200 pt-4">
          <p className={cn('flex items-center gap-2 text-sm font-medium', state.data.match ? 'text-emerald-700' : 'text-red-700')}>
            {state.data.match ? <CircleCheck className="size-4" /> : <CircleX className="size-4" />}
            {state.data.match ? 'Hashes match — the stored file is unaltered' : 'Hash mismatch — the stored file has changed'}
          </p>
          <div className="grid gap-1 font-mono text-[11px] break-all text-slate-500 sm:text-xs">
            <span><span className="text-slate-400">recorded </span>{state.data.storedHash}</span>
            <span><span className="text-slate-400">computed </span>{state.data.computedHash}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function IdResult({ response, queriedId }: { response: VerifyResponse; queriedId: string }) {
  const style = RESULT_STYLES[response.result];
  const Icon = style.icon;
  const toast = useToast();
  const [busy, setBusy] = useState<'view' | 'download' | null>(null);
  const certificate = response.certificate;

  const open = async (mode: 'view' | 'download') => {
    if (!certificate) return;
    setBusy(mode);
    try {
      const { url } = await getPublicFileUrl(certificate.certificateId, mode === 'view' ? 'inline' : 'attachment');
      openSignedUrl(url, mode);
    } catch (err) {
      toast.error('Could not open the certificate', getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const subtitle =
    response.result === 'VERIFIED' && certificate
      ? `This certificate was issued by ${certificate.issuingOrganization} and is currently active.`
      : response.result === 'REVOKED' && certificate
        ? `This certificate was revoked by the issuer${certificate.revokedAt ? ` on ${formatDate(certificate.revokedAt, 'long')}` : ''} and is no longer valid.`
        : `No certificate with the ID “${queriedId}” exists in CertiVault. Check the ID for typos — or the certificate may not be genuine.`;

  return (
    <div className="animate-slide-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={cn('flex items-start gap-4 border-b p-5 sm:p-6', style.band)}>
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-full', style.iconWrap)}>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-[0.14em] uppercase opacity-60">
            {response.result.replace('_', ' ')}
          </p>
          <h2 className={cn('text-xl font-semibold', style.titleColor)}>{style.title}</h2>
          <p className="mt-1 text-sm break-words text-slate-600">{subtitle}</p>
        </div>
      </div>

      {certificate && (
        <div className="space-y-6 p-5 sm:p-6">
          <CertificateDetails certificate={certificate} />
          {response.result === 'VERIFIED' && (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={() => open('download')} loading={busy === 'download'} icon={<Download className="size-4" />}>
                  Download certificate
                </Button>
                <Button variant="secondary" onClick={() => open('view')} loading={busy === 'view'} icon={<Eye className="size-4" />}>
                  View PDF
                </Button>
              </div>
              <IntegrityPanel certificateId={certificate.certificateId} />
            </>
          )}
        </div>
      )}

      <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 text-xs text-slate-500 sm:px-6">
        Checked against CertiVault records on {formatDateTime(response.checkedAt)}
      </div>
    </div>
  );
}

function FileCheck() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FileCheckResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (f: File | undefined | null) => {
    setResult(null);
    setError(null);
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.');
      return;
    }
    setFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const submit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      setResult(await checkPdfFile(file));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const outcome = result
    ? {
        AUTHENTIC: { tone: 'success' as const, title: 'Authentic document', text: 'This file is byte-for-byte identical to a certificate issued through CertiVault, and that certificate is active.' },
        AUTHENTIC_REVOKED: { tone: 'warning' as const, title: 'Authentic, but revoked', text: 'This file matches an issued certificate, but the issuer has since revoked it. It is no longer valid.' },
        NO_MATCH: { tone: 'error' as const, title: 'No matching certificate', text: 'This file does not match any certificate issued through CertiVault. It may have been modified, re-saved, or not issued here.' },
      }[result.result]
    : null;

  return (
    <div className="space-y-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
          dragging ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 bg-slate-50/50',
        )}
      >
        <span className="flex size-11 items-center justify-center rounded-xl bg-white text-brand-700 shadow-xs ring-1 ring-slate-200">
          <Upload className="size-5" />
        </span>
        {file ? (
          <p className="mt-4 text-sm font-medium break-all text-slate-900">
            {file.name} <span className="font-normal text-slate-500">· {formatBytes(file.size)}</span>
          </p>
        ) : (
          <p className="mt-4 text-sm font-medium text-slate-900">Drop a certificate PDF here</p>
        )}
        <p className="mt-1 text-[13px] text-slate-500">The file is hashed and compared with our records. It is not stored.</p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
            {file ? 'Choose another' : 'Choose file'}
          </Button>
          {file && (
            <Button size="sm" onClick={submit} loading={loading} icon={<FileSearch className="size-4" />}>
              Check file
            </Button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>

      {error && <Alert tone="error" title={error} icon={<CircleX className="size-4" />} />}

      {result && outcome && (
        <div className="animate-slide-up space-y-4">
          <Alert
            tone={outcome.tone}
            title={outcome.title}
            icon={result.result === 'NO_MATCH' ? <CircleX className="size-5" /> : result.result === 'AUTHENTIC' ? <CircleCheck className="size-5" /> : <ShieldBan className="size-5" />}
          >
            {outcome.text}
            <p className="mt-2 font-mono text-[11px] break-all opacity-75">SHA-256 {result.sha256Hash}</p>
          </Alert>
          {result.certificate && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <CertificateDetails certificate={result.certificate} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function VerifyPage() {
  const { certificateId: routeId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const tab: Tab = searchParams.get('tab') === 'file' ? 'file' : 'id';

  const [input, setInput] = useState(routeId ?? '');
  const [inputError, setInputError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ data: VerifyResponse; id: string } | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  useDocumentTitle(response?.data.result === 'VERIFIED' ? 'Certificate verified' : 'Verify a certificate');

  const runVerification = useCallback(async (id: string) => {
    setLoading(true);
    setRequestError(null);
    setResponse(null);
    try {
      setResponse({ data: await verifyCertificate(id), id });
    } catch (err) {
      setRequestError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // QR codes open /verify/<id> — verify automatically.
  useEffect(() => {
    if (routeId) {
      setInput(routeId);
      runVerification(extractCertificateId(routeId));
    } else {
      setResponse(null);
    }
  }, [routeId, runVerification]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const id = extractCertificateId(input);
    if (!id) return setInputError('Enter a certificate ID.');
    if (!isCertificateId(id)) {
      return setInputError('That doesn’t look like a CertiVault ID. It has the form xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.');
    }
    setInputError(null);
    if (id === routeId) runVerification(id);
    else navigate(`/verify/${id}`);
  };

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(searchParams);
    if (t === 'file') next.set('tab', 'file');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-gradient-to-b from-brand-50/80 to-transparent" aria-hidden />
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-brand-900 text-white shadow-lg shadow-brand-900/20">
            <ShieldCheck className="size-6" />
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Verify a certificate</h1>
          <p className="mx-auto mt-3 max-w-lg text-[15px] text-slate-500">
            Confirm that a certificate was genuinely issued through CertiVault and check whether it is still valid.
          </p>
        </div>

        <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
            {(
              [
                ['id', 'Certificate ID', Search],
                ['file', 'Upload PDF', FileSearch],
              ] as const
            ).map(([key, label, Icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition',
                  tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="p-4 sm:p-6">
            {tab === 'id' ? (
              <form onSubmit={onSubmit} noValidate>
                <label htmlFor="certificate-id" className="text-sm font-medium text-slate-700">
                  Certificate ID or verification link
                </label>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    id="certificate-id"
                    value={input}
                    onChange={(e) => {
                      setInput(e.target.value);
                      setInputError(null);
                    }}
                    placeholder="e.g. 3f6c2a91-7d4e-4b8a-9c21-5e0f8b7a6d13"
                    autoComplete="off"
                    spellCheck={false}
                    aria-invalid={inputError ? true : undefined}
                    className={cn(
                      'h-12 flex-1 rounded-xl border-0 px-4 font-mono text-sm text-slate-900 ring-1 ring-inset placeholder:font-sans placeholder:text-slate-400 focus:ring-2 focus:outline-none',
                      inputError ? 'ring-red-300 focus:ring-red-500' : 'ring-slate-200 focus:ring-brand-500',
                    )}
                  />
                  <Button type="submit" size="lg" loading={loading} icon={<ShieldCheck className="size-4" />}>
                    Verify
                  </Button>
                </div>
                {inputError && <p className="mt-2 text-[13px] text-red-600">{inputError}</p>}
                <p className="mt-3 text-[13px] text-slate-500">
                  Scanning the QR code on a certificate opens this page and verifies it automatically.
                </p>
              </form>
            ) : (
              <FileCheck />
            )}
          </div>
        </div>

        {tab === 'id' && (
          <div className="mt-6" aria-live="polite">
            {loading && (
              <div className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-12 text-sm text-slate-500">
                <Spinner /> Checking CertiVault records…
              </div>
            )}
            {requestError && <Alert tone="error" title="Verification failed" icon={<CircleX className="size-4" />}>{requestError}</Alert>}
            {response && <IdResult response={response.data} queriedId={response.id} />}
          </div>
        )}

        <div className="mt-10 flex items-start gap-3 rounded-xl border border-slate-200 bg-white/70 p-4 text-[13px] text-slate-500">
          <Info className="mt-0.5 size-4 shrink-0 text-brand-600" />
          <p>
            Verification is performed against CertiVault's live database every time — a QR code or PDF on its own proves
            nothing. Certificate files are kept in a private, encrypted Amazon S3 bucket and are only delivered through
            short-lived signed links.
          </p>
        </div>
      </div>
    </div>
  );
}
