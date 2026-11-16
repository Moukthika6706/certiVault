import { cn } from '../lib/format';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#142347" />
      <path
        d="M16 6.5 8.5 9.4v6.1c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10V9.4L16 6.5Z"
        fill="none"
        stroke="#c9a65a"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="m12.6 16 2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className={cn('text-[17px] font-semibold tracking-tight', light ? 'text-white' : 'text-slate-900')}>
        Certi<span className={light ? 'text-gold-300' : 'text-brand-700'}>Vault</span>
      </span>
    </span>
  );
}
