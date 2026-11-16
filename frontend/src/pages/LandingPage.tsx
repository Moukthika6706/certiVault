import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Ban,
  CircleCheck,
  Cloud,
  Database,
  FileCheck,
  FilePlus,
  FingerprintPattern,
  Gauge,
  Hash,
  KeyRound,
  LayoutDashboard,
  Lock,
  QrCode,
  ScanLine,
  Search,
  Server,
  ShieldCheck,
  TriangleExclamationPoint,
} from 'lucide-react';
import { CertificatePreview } from '../components/CertificatePreview';
import { Button, ButtonLink } from '../components/ui';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { extractCertificateId } from '../lib/format';

const PROBLEMS = [
  { problem: 'Certificates can be forged or edited', solution: 'Every PDF is fingerprinted with SHA-256 at issuance' },
  { problem: 'Verification means emails and phone calls', solution: 'Anyone can verify in seconds — no account needed' },
  { problem: 'Originals get lost on laptops and in drawers', solution: 'Encrypted, versioned copies are kept in Amazon S3' },
  { problem: 'No way to withdraw a certificate', solution: 'Administrators can revoke instantly; checks update live' },
];

const STEPS = [
  {
    icon: FilePlus,
    title: 'Issue',
    text: 'An administrator issues a certificate. CertiVault assigns a unique ID and embeds a verification QR code in the PDF.',
  },
  {
    icon: Lock,
    title: 'Store',
    text: 'The PDF is uploaded to a private, encrypted Amazon S3 bucket and its SHA-256 fingerprint is recorded.',
  },
  {
    icon: QrCode,
    title: 'Share',
    text: 'The recipient shares the PDF, the QR code or just the certificate ID with an employer or institution.',
  },
  {
    icon: ShieldCheck,
    title: 'Verify',
    text: 'The verifier scans the QR or enters the ID. The result comes from our live records — not from the document itself.',
  },
];

const FEATURES = [
  { icon: FingerprintPattern, title: 'Tamper-evident files', text: 'Upload any PDF to check it. A single changed byte produces a different SHA-256 hash and fails the match.' },
  { icon: Lock, title: 'Private, encrypted storage', text: 'Certificates live in a private S3 bucket with Block Public Access and SSE-S3 encryption at rest.' },
  { icon: QrCode, title: 'QR-code verification', text: 'Each generated certificate carries a QR code that opens its public verification page directly.' },
  { icon: Ban, title: 'Instant revocation', text: 'Revoked certificates immediately report REVOKED to every verifier, with the date of revocation.' },
  { icon: KeyRound, title: 'Short-lived download links', text: 'Files are delivered through presigned URLs that expire within minutes. Nothing is ever public.' },
  { icon: LayoutDashboard, title: 'Administrator dashboard', text: 'Issue, search, filter, download and revoke certificates from one secure, JWT-protected console.' },
];

const AWS = [
  { icon: Server, name: 'Amazon EC2', role: 'Hosts the web application', text: 'Nginx serves the React app and proxies API calls to the Node.js backend managed by PM2.' },
  { icon: Database, name: 'Amazon S3', role: 'Stores certificate PDFs', text: 'Private bucket with versioning and SSE-S3 encryption. Keys are organised as certificates/<year>/<id>.pdf.' },
  { icon: KeyRound, name: 'AWS IAM', role: 'Grants least-privilege access', text: 'An EC2 instance role lets the app read and write only this bucket — no access keys in code.' },
  { icon: Gauge, name: 'Amazon CloudWatch', role: 'Monitors the server', text: 'EC2 CPU and status-check metrics with an alarm that fires when the instance is under strain.' },
];

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-brand-600">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-slate-900 sm:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-[17px] leading-relaxed text-pretty text-slate-500">{text}</p>}
    </div>
  );
}

function QuickVerify() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const id = extractCertificateId(value);
    navigate(id ? `/verify/${id}` : '/verify');
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      <label htmlFor="quick-verify" className="sr-only">
        Certificate ID
      </label>
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
        <input
          id="quick-verify"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Paste a certificate ID or verification link"
          className="h-12 w-full rounded-xl border-0 bg-white pr-4 pl-10 font-mono text-sm text-slate-900 ring-1 ring-slate-200 ring-inset placeholder:font-sans placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
        />
      </div>
      <Button type="submit" size="lg" icon={<ShieldCheck className="size-4" />}>
        Verify
      </Button>
    </form>
  );
}

export function LandingPage() {
  useDocumentTitle('');

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_70%_0%,var(--color-brand-50),transparent_70%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(var(--color-slate-200)_1px,transparent_1px),linear-gradient(90deg,var(--color-slate-200)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]"
          aria-hidden
        />
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 pt-14 pb-20 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-24 lg:pb-28">
          <div className="animate-slide-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[13px] text-slate-600 shadow-xs">
              <Cloud className="size-3.5 text-brand-600" />
              Cloud-based credential verification on AWS
            </span>
            <h1 className="mt-6 text-[40px] leading-[1.05] font-semibold tracking-tight text-balance text-slate-900 sm:text-[56px]">
              Certificates you can trust.{' '}
              <span className="font-serif font-normal text-brand-700 italic">Credentials you can verify.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-pretty text-slate-500">
              A secure cloud-powered platform for issuing, storing, and verifying digital certificates — so anyone can
              confirm a credential is genuine in seconds.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink to="/verify" size="lg" icon={<ShieldCheck className="size-[18px]" />}>
                Verify Certificate
              </ButtonLink>
              <ButtonLink to="/admin/login" size="lg" variant="secondary">
                Administrator Login
                <ArrowRight className="size-4" />
              </ButtonLink>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-slate-200 pt-6">
              {[
                ['SHA-256', 'integrity hashes'],
                ['SSE-S3', 'encryption at rest'],
                ['< 1 sec', 'to verify'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[15px] font-semibold text-slate-900">{k}</dt>
                  <dd className="mt-0.5 text-[13px] text-slate-500">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-xl animate-fade-in lg:max-w-none">
            <CertificatePreview
              recipientName="Ananya Krishnan"
              certificateTitle="Certificate of Completion"
              courseName="Cloud Computing with Amazon Web Services"
              issuingOrganization="School of Computer Science & Engineering"
              issueDate="2026-11-12"
              certificateId="3f6c2a91-7d4e-4b8a-9c21-5e0f8b7a6d13"
              className="rotate-[1.2deg]"
            />
            <div className="absolute -bottom-6 -left-2 w-[250px] rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl shadow-slate-900/10 backdrop-blur sm:-left-8">
              <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-emerald-50">
                  <CircleCheck className="size-5 text-emerald-600" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Certificate verified</p>
                  <p className="text-xs text-slate-500">Active · checked against live records</p>
                </div>
              </div>
            </div>
            <div className="absolute -top-4 right-2 hidden items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-lg shadow-slate-900/5 sm:flex">
              <Lock className="size-3.5 text-brand-600" />
              Stored privately in Amazon S3
            </div>
            <p className="sr-only">Sample certificate for illustration only.</p>
          </div>
        </div>
      </section>

      {/* ── Introduction ─────────────────────────────────────────── */}
      <section className="border-y border-slate-200/70 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="text-sm font-semibold text-brand-600">Why CertiVault</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance text-slate-900 sm:text-4xl">
              Paper-era certificates don't survive the internet.
            </h2>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-500">
              Colleges and training providers issue thousands of certificates a year, yet checking one still depends on
              trusting a PDF that anybody can edit. CertiVault keeps the authoritative record in the cloud, so the
              answer to <em>"is this real?"</em> is always one lookup away.
            </p>
          </div>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {PROBLEMS.map(({ problem, solution }) => (
              <li key={problem} className="grid gap-2 p-5 sm:grid-cols-2 sm:gap-6">
                <p className="flex items-start gap-2.5 text-sm text-slate-500">
                  <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  {problem}
                </p>
                <p className="flex items-start gap-2.5 text-sm font-medium text-slate-900">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  {solution}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────── */}
      <section id="how-it-works" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            eyebrow="How verification works"
            title="From issuance to verification in four steps"
            text="Authenticity is decided by CertiVault's records, never by the document alone. A QR code only tells the verifier where to look."
          />
          <ol className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-900 text-white">
                    <Icon className="size-5" />
                  </span>
                  <span className="font-mono text-xs text-slate-400">0{i + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-semibold text-slate-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section id="features" className="scroll-mt-16 bg-brand-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-gold-400">Platform features</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Everything an institution needs to issue credentials with confidence
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="bg-brand-950 p-7 transition hover:bg-brand-900/60">
                <Icon className="size-6 text-gold-400" />
                <h3 className="mt-5 text-base font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-brand-200/75">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AWS architecture ─────────────────────────────────────── */}
      <section id="architecture" className="scroll-mt-16">
        <div className="mx-auto max-w-6xl px-4 py-24 sm:px-6">
          <SectionHeading
            eyebrow="Cloud architecture"
            title="Built on Amazon Web Services"
            text="CertiVault runs on AWS infrastructure — compute, storage, identity and monitoring each handled by a dedicated managed service."
          />
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {AWS.map(({ icon: Icon, name, role, text }) => (
              <div key={name} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/10">
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-5 text-base font-semibold text-slate-900">{name}</h3>
                <p className="text-sm font-medium text-brand-700">{role}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-5 text-sm text-slate-600">
            {['Browser', 'Nginx on EC2', 'Node.js API', 'AWS SDK + IAM role', 'Private S3 bucket'].map((step, i, all) => (
              <span key={step} className="flex items-center gap-3">
                <span className="rounded-md bg-white px-2.5 py-1 font-medium ring-1 ring-slate-200">{step}</span>
                {i < all.length - 1 && <ArrowRight className="size-4 text-slate-400" />}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Steps to verify ──────────────────────────────────────── */}
      <section id="verify-steps" className="scroll-mt-16 border-t border-slate-200/70 bg-slate-50/70">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold text-brand-600">Verify a certificate</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Checking a credential takes three steps
            </h2>
            <ol className="mt-8 space-y-6">
              {[
                { icon: ScanLine, title: 'Find the ID or QR code', text: 'Both are printed at the bottom of every CertiVault certificate.' },
                { icon: Hash, title: 'Scan the QR or enter the ID', text: 'Scanning opens the verification page directly. Or paste the ID below.' },
                { icon: FileCheck, title: 'Read the result', text: 'VERIFIED, REVOKED or NOT FOUND — with the issuer, recipient and date.' },
              ].map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-700">
                    <Icon className="size-[18px]" />
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      <span className="mr-1.5 text-slate-400">{i + 1}.</span>
                      {title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
            <h3 className="text-lg font-semibold text-slate-900">Verify now</h3>
            <p className="mt-1 text-sm text-slate-500">No account needed. Verification is free and public.</p>
            <div className="mt-6">
              <QuickVerify />
            </div>
            <p className="mt-4 text-xs text-slate-400">
              Have the PDF instead?{' '}
              <Link to="/verify?tab=file" className="font-medium text-brand-700 hover:underline">
                Check the file itself
              </Link>{' '}
              for tampering.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
