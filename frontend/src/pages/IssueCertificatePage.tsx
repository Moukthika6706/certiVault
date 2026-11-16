import { useRef, useState, type DragEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CircleCheck,
  Download,
  ExternalLink,
  FilePlus,
  FileText,
  Info,
  QrCode,
  Upload,
  X,
} from 'lucide-react';
import { CertificatePreview } from '../components/CertificatePreview';
import {
  Alert,
  Button,
  ButtonLink,
  Card,
  CardHeader,
  CopyButton,
  Input,
  PageHeader,
  StorageBadge,
  Textarea,
} from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn, formatBytes, todayIso } from '../lib/format';
import { getErrorCode, getErrorMessage, getFieldErrors } from '../services/api';
import { getAdminFileUrl, issueCertificate, openSignedUrl } from '../services/certificateService';
import type { CertificateWithQr, IssueCertificatePayload } from '../types';

const ORG_KEY = 'certivault.lastOrganization';
const MAX_MB = 5;

function rememberedOrg(): string {
  try {
    return localStorage.getItem(ORG_KEY) ?? '';
  } catch {
    return '';
  }
}

function emptyForm(mode: IssueCertificatePayload['mode'] = 'generate'): IssueCertificatePayload {
  return {
    mode,
    recipientName: '',
    recipientEmail: '',
    certificateTitle: 'Certificate of Completion',
    courseName: '',
    issuingOrganization: rememberedOrg(),
    issueDate: todayIso(),
    description: '',
  };
}

type Errors = Partial<Record<keyof IssueCertificatePayload | 'file', string>>;

function validate(form: IssueCertificatePayload, file: File | null): Errors {
  const e: Errors = {};
  const len = (v: string) => v.trim().length;
  if (len(form.recipientName) < 2) e.recipientName = 'Enter the recipient’s full name';
  if (form.recipientEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.recipientEmail.trim()))
    e.recipientEmail = 'Enter a valid email address';
  if (len(form.certificateTitle) < 3) e.certificateTitle = 'Enter a certificate title';
  if (len(form.courseName) < 2) e.courseName = 'Enter the course or program name';
  if (len(form.issuingOrganization) < 2) e.issuingOrganization = 'Enter the issuing organization';
  if (!form.issueDate) e.issueDate = 'Choose the issue date';
  if (form.description.length > 400) e.description = 'Keep the description under 400 characters';
  if (form.mode === 'upload') {
    if (!file) e.file = 'Attach the certificate PDF';
    else if (file.size > MAX_MB * 1024 * 1024) e.file = `The PDF must be smaller than ${MAX_MB} MB`;
  }
  return e;
}

function SuccessView({ result, onReset }: { result: CertificateWithQr; onReset: () => void }) {
  const { certificate: c, qrCodeDataUrl } = result;
  const toast = useToast();
  const [downloading, setDownloading] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const { url } = await getAdminFileUrl(c.certificateId, 'attachment');
      openSignedUrl(url, 'download');
    } catch (err) {
      toast.error('Download failed', getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="animate-slide-up">
      <Card className="overflow-hidden">
        <div className="flex flex-col items-start gap-4 border-b border-emerald-100 bg-emerald-50/70 p-6 sm:flex-row sm:items-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CircleCheck className="size-6" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-emerald-950">Certificate issued successfully</h2>
            <p className="text-sm text-emerald-900/70">
              {c.recipientName}'s certificate was {c.source === 'GENERATED' ? 'generated' : 'uploaded'}, hashed and stored in{' '}
              {c.storage.backend === 'S3' ? 'Amazon S3' : 'local development storage'}.
            </p>
          </div>
        </div>

        <div className="grid gap-8 p-6 lg:grid-cols-[1fr_220px]">
          <dl className="space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Certificate ID</dt>
              <dd className="mt-1 flex items-center gap-1 font-mono text-[13px] break-all text-slate-900">
                {c.certificateId}
                <CopyButton value={c.certificateId} iconOnly label="Copy ID" toastMessage="Certificate ID copied" />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Public verification link</dt>
              <dd className="mt-1 flex items-center gap-1 text-[13px] break-all text-brand-700">
                {c.verificationUrl}
                <CopyButton value={c.verificationUrl} iconOnly label="Copy link" toastMessage="Verification link copied" />
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Storage</dt>
              <dd className="mt-1 space-y-1">
                <StorageBadge backend={c.storage.backend} />
                <p className="font-mono text-[12px] break-all text-slate-600">{c.storage.objectKey}</p>
                {c.storage.versionId && (
                  <p className="font-mono text-[12px] text-slate-500">VersionId {c.storage.versionId}</p>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">SHA-256 fingerprint</dt>
              <dd className="mt-1 font-mono text-[12px] break-all text-slate-600">{c.sha256Hash}</dd>
            </div>
          </dl>

          <div className="flex flex-col items-center rounded-xl border border-slate-200 p-4">
            <img src={qrCodeDataUrl} alt="Verification QR code" className="size-40" />
            <a
              href={qrCodeDataUrl}
              download={`CertiVault-QR-${c.certificateId}.png`}
              className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:underline"
            >
              <QrCode className="size-3.5" /> Save QR code
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/60 p-4 sm:flex-row sm:justify-end sm:px-6">
          <Button variant="ghost" onClick={onReset} icon={<FilePlus className="size-4" />}>
            Issue another
          </Button>
          <a
            href={c.verificationUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-slate-700 ring-1 ring-slate-200 ring-inset hover:bg-white"
          >
            <ExternalLink className="size-4" /> Open verification page
          </a>
          <Button variant="secondary" onClick={download} loading={downloading} icon={<Download className="size-4" />}>
            Download PDF
          </Button>
          <ButtonLink to={`/admin/certificates/${c.certificateId}`}>
            View details <ArrowRight className="size-4" />
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}

export function IssueCertificatePage() {
  useDocumentTitle('Issue certificate');
  const toast = useToast();
  const [form, setForm] = useState<IssueCertificatePayload>(() => emptyForm());
  const [file, setFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CertificateWithQr | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof IssueCertificatePayload>(key: K, value: IssueCertificatePayload[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setErrors((e) => ({ ...e, file: 'Only PDF files are accepted' }));
      return;
    }
    setFile(f);
    setErrors((e) => ({ ...e, file: f.size > MAX_MB * 1024 * 1024 ? `The PDF must be smaller than ${MAX_MB} MB` : undefined }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const found = validate(form, file);
    setErrors(found);
    setFormError(null);
    if (Object.values(found).some(Boolean)) return;

    setSubmitting(true);
    try {
      const res = await issueCertificate(form, file);
      try {
        localStorage.setItem(ORG_KEY, form.issuingOrganization.trim());
      } catch {
        /* ignore */
      }
      setResult(res);
      toast.success('Certificate issued', `Stored as ${res.certificate.storage.objectKey}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      const fields = getFieldErrors(err);
      if (Object.keys(fields).length) setErrors(fields as Errors);
      if (getErrorCode(err) === 'FILE_TOO_LARGE' || getErrorCode(err) === 'INVALID_FILE' || getErrorCode(err) === 'DUPLICATE_FILE') {
        setErrors((x) => ({ ...x, file: getErrorMessage(err) }));
      }
      setFormError(getErrorMessage(err, 'The certificate could not be issued.'));
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setResult(null);
    setForm(emptyForm(form.mode));
    setFile(null);
    setErrors({});
    setFormError(null);
  };

  if (result) {
    return (
      <>
        <PageHeader title="Issue certificate" description="The certificate is live and can be verified publicly right away." />
        <SuccessView result={result} onReset={reset} />
      </>
    );
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  return (
    <>
      <PageHeader
        title="Issue certificate"
        description="Create a new verifiable certificate. The PDF is fingerprinted with SHA-256 and stored in Amazon S3."
      />

      <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Certificate source" description="Choose how the certificate PDF is produced." />
            <div className="grid gap-3 p-5 sm:grid-cols-2 sm:p-6">
              {(
                [
                  ['generate', 'Generate from template', 'CertiVault designs the PDF and embeds a verification QR code.', FileText],
                  ['upload', 'Upload existing PDF', 'Register a certificate you already designed elsewhere.', Upload],
                ] as const
              ).map(([value, title, text, Icon]) => (
                <label
                  key={value}
                  className={cn(
                    'relative flex cursor-pointer gap-3 rounded-xl border p-4 transition',
                    form.mode === value ? 'border-brand-600 bg-brand-50/50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-slate-300',
                  )}
                >
                  <input
                    type="radio"
                    name="mode"
                    value={value}
                    checked={form.mode === value}
                    onChange={() => set('mode', value)}
                    className="sr-only"
                  />
                  <Icon className={cn('mt-0.5 size-5 shrink-0', form.mode === value ? 'text-brand-700' : 'text-slate-400')} />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{title}</span>
                    <span className="mt-0.5 block text-[13px] text-slate-500">{text}</span>
                  </span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Certificate details" />
            <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
              {formError && (
                <Alert tone="error" title="Could not issue certificate" className="sm:col-span-2">
                  {formError}
                </Alert>
              )}
              <Input
                label="Recipient full name"
                value={form.recipientName}
                onChange={(e) => set('recipientName', e.target.value)}
                error={errors.recipientName}
                placeholder="e.g. Ananya Krishnan"
                maxLength={120}
              />
              <Input
                label="Recipient email"
                optional
                type="email"
                value={form.recipientEmail}
                onChange={(e) => set('recipientEmail', e.target.value)}
                error={errors.recipientEmail}
                placeholder="ananya@example.com"
                hint="Visible to administrators only."
              />
              <Input
                label="Certificate title"
                value={form.certificateTitle}
                onChange={(e) => set('certificateTitle', e.target.value)}
                error={errors.certificateTitle}
                maxLength={120}
              />
              <Input
                label="Course or program"
                value={form.courseName}
                onChange={(e) => set('courseName', e.target.value)}
                error={errors.courseName}
                placeholder="e.g. Cloud Computing with AWS"
                maxLength={160}
              />
              <Input
                label="Issuing organization"
                value={form.issuingOrganization}
                onChange={(e) => set('issuingOrganization', e.target.value)}
                error={errors.issuingOrganization}
                placeholder="e.g. School of Computer Science & Engineering"
                maxLength={120}
              />
              <Input
                label="Issue date"
                type="date"
                value={form.issueDate}
                onChange={(e) => set('issueDate', e.target.value)}
                error={errors.issueDate}
              />
              <Textarea
                label="Completion description"
                optional
                wrapperClassName="sm:col-span-2"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                error={errors.description}
                maxLength={400}
                rows={3}
                placeholder="e.g. For successfully completing the 12-week course, including a capstone project deployed on AWS."
                hint={`${form.description.length}/400 characters${form.mode === 'generate' ? ' · printed on the certificate' : ''}`}
              />
            </div>
          </Card>

          {form.mode === 'upload' && (
            <Card className="animate-fade-in">
              <CardHeader title="Certificate PDF" description={`PDF only, up to ${MAX_MB} MB.`} />
              <div className="p-5 sm:p-6">
                {file ? (
                  <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                    <span className="flex size-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setErrors((x) => ({ ...x, file: undefined }));
                      }}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Remove file"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                      'flex w-full flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition',
                      dragging ? 'border-brand-400 bg-brand-50/50' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50',
                      errors.file && 'border-red-300',
                    )}
                  >
                    <Upload className="size-6 text-slate-400" />
                    <span className="mt-3 text-sm font-medium text-slate-900">Click to choose or drag a PDF here</span>
                    <span className="mt-1 text-[13px] text-slate-500">The file is validated, hashed and uploaded to S3.</span>
                  </button>
                )}
                {errors.file && <p className="mt-2 text-[13px] text-red-600">{errors.file}</p>}
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    pickFile(e.target.files?.[0]);
                    e.target.value = '';
                  }}
                />
              </div>
            </Card>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/admin/certificates" className="text-center text-sm text-slate-500 hover:text-slate-900">
              Cancel
            </Link>
            <Button type="submit" size="lg" loading={submitting} icon={<FilePlus className="size-4" />}>
              {submitting
                ? form.mode === 'generate'
                  ? 'Generating & uploading…'
                  : 'Uploading…'
                : form.mode === 'generate'
                  ? 'Generate & issue certificate'
                  : 'Upload & issue certificate'}
            </Button>
          </div>
        </div>

        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          {form.mode === 'generate' ? (
            <>
              <p className="text-sm font-medium text-slate-700">Live preview</p>
              <CertificatePreview
                recipientName={form.recipientName}
                certificateTitle={form.certificateTitle}
                courseName={form.courseName}
                issuingOrganization={form.issuingOrganization}
                issueDate={form.issueDate}
                description={form.description}
              />
              <p className="text-[13px] text-slate-500">
                The real QR code and certificate ID are generated when you issue the certificate.
              </p>
            </>
          ) : (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 size-5 shrink-0 text-brand-600" />
                <div className="space-y-2 text-sm text-slate-600">
                  <p className="font-medium text-slate-900">About uploaded certificates</p>
                  <p>Your PDF is stored exactly as uploaded — CertiVault does not modify it, so its SHA-256 stays verifiable.</p>
                  <p>Because the file isn't changed, a QR code is not printed on it. After issuing, share the verification link or save the QR code shown.</p>
                </div>
              </div>
            </Card>
          )}
        </aside>
      </form>
    </>
  );
}
