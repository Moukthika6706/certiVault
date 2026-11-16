import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Copy, Inbox, X } from 'lucide-react';
import { cn } from '../../lib/format';
import { useToast } from '../../context/ToastContext';
import type { CertificateStatus, StorageBackend } from '../../types';

export { Button, ButtonLink, buttonClasses } from './Button';
export { Input, Textarea, FieldShell } from './Field';

// ── Card ────────────────────────────────────────────────────────────
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200/80 bg-white shadow-xs shadow-slate-900/[0.03]', className)}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ── Page header ─────────────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-[15px] text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Status badge ────────────────────────────────────────────────────
export function StatusBadge({ status, className }: { status: CertificateStatus; className?: string }) {
  const active = status === 'ACTIVE';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        active ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/15' : 'bg-red-50 text-red-700 ring-red-600/15',
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-red-500')} />
      {active ? 'Active' : 'Revoked'}
    </span>
  );
}

export function StorageBadge({ backend }: { backend: StorageBackend }) {
  return backend === 'S3' ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-600/15 ring-inset">
      Amazon S3
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-500/15 ring-inset">
      Local dev storage
    </span>
  );
}

// ── Loading ─────────────────────────────────────────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200/70', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn('inline-block size-5 animate-spin rounded-full border-2 border-slate-200 border-t-brand-700', className)}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner className="size-7" />
    </div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        {icon ?? <Inbox className="size-6" />}
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Copy button ─────────────────────────────────────────────────────
export function CopyButton({
  value,
  label = 'Copy',
  toastMessage = 'Copied to clipboard',
  className,
  iconOnly,
}: {
  value: string;
  label?: string;
  toastMessage?: string;
  className?: string;
  iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(toastMessage);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy', 'Your browser blocked clipboard access.');
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md text-[13px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900',
        iconOnly ? 'p-1.5' : 'px-2 py-1',
        className,
      )}
    >
      {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
      {!iconOnly && (copied ? 'Copied' : label)}
    </button>
  );
}

// ── Modal ───────────────────────────────────────────────────────────
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  icon,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('textarea, input, button')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 animate-fade-in bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={panelRef} className="relative w-full max-w-md animate-slide-up rounded-2xl bg-white shadow-2xl shadow-slate-950/20">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <div className="p-6">
          {icon && <div className="mb-4">{icon}</div>}
          <h2 className="pr-6 text-lg font-semibold text-slate-900">{title}</h2>
          {description && <div className="mt-1.5 text-sm text-slate-500">{description}</div>}
          {children && <div className="mt-5">{children}</div>}
        </div>
        {footer && (
          <div className="flex flex-col-reverse gap-2 rounded-b-2xl border-t border-slate-100 bg-slate-50/70 px-6 py-4 sm:flex-row sm:justify-end">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail list row ─────────────────────────────────────────────────
export function DetailRow({ label, children, mono }: { label: string; children: ReactNode; mono?: boolean }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className={cn('min-w-0 text-sm break-words text-slate-900', mono && 'font-mono text-[13px]')}>{children}</dd>
    </div>
  );
}

export function Alert({
  tone = 'info',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'bg-brand-50/70 text-brand-900 ring-brand-200/70',
    warning: 'bg-amber-50 text-amber-900 ring-amber-200',
    error: 'bg-red-50 text-red-900 ring-red-200',
    success: 'bg-emerald-50 text-emerald-900 ring-emerald-200',
  };
  return (
    <div className={cn('flex gap-3 rounded-xl p-4 text-sm ring-1 ring-inset', tones[tone], className)} role={tone === 'error' ? 'alert' : undefined}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-85')}>{children}</div>}
      </div>
    </div>
  );
}
