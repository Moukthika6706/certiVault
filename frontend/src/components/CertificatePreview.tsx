import { useMemo } from 'react';
import { cn, formatDate } from '../lib/format';

/** Decorative QR-like grid used when no real QR code is available (e.g. landing page, live preview). */
function MockQr({ seed = 'certivault' }: { seed?: string }) {
  const cells = useMemo(() => {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const out: [number, number][] = [];
    const size = 21;
    const inFinder = (x: number, y: number) =>
      (x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        h = Math.imul(h ^ (x * 31 + y), 2654435761) >>> 0;
        if (!inFinder(x, y) && h % 100 < 46) out.push([x, y]);
      }
    return out;
  }, [seed]);

  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="currentColor" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  );

  return (
    <svg viewBox="-1 -1 23 23" className="size-full text-brand-900" aria-hidden shapeRendering="crispEdges">
      <rect x="-1" y="-1" width="23" height="23" fill="#fff" />
      {cells.map(([x, y]) => (
        <rect key={`${x}:${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />
      ))}
      {finder(0, 0)}
      {finder(14, 0)}
      {finder(0, 14)}
    </svg>
  );
}

export interface CertificatePreviewProps {
  recipientName: string;
  certificateTitle: string;
  courseName: string;
  issuingOrganization: string;
  issueDate: string;
  description?: string | null;
  certificateId?: string;
  qrDataUrl?: string;
  className?: string;
}

/**
 * HTML rendering that mirrors the PDFKit template in backend/src/services/pdfService.ts.
 * Sizes use container-query units so it scales with its width.
 */
export function CertificatePreview(props: CertificatePreviewProps) {
  const {
    recipientName,
    certificateTitle,
    courseName,
    issuingOrganization,
    issueDate,
    description,
    certificateId,
    qrDataUrl,
    className,
  } = props;

  return (
    <div className={cn('@container w-full', className)}>
      <div className="relative aspect-[1.414] w-full overflow-hidden rounded-[0.6cqw] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_40px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5">
        <div className="absolute inset-x-0 top-0 h-[0.75cqw] bg-brand-900" />
        <div className="absolute inset-x-0 bottom-0 h-[0.75cqw] bg-brand-900" />
        <div className="absolute inset-[2.4cqw] border-[0.28cqw] border-brand-900" />
        <div className="absolute inset-[3.3cqw] border-[0.08cqw] border-gold-500" />

        <div className="absolute inset-[3.3cqw] flex flex-col items-center px-[6cqw] pt-[3.4cqw] text-center">
          <p className="max-w-full truncate text-[1.35cqw] font-bold tracking-[0.35em] text-gold-500 uppercase">
            {issuingOrganization || 'Issuing organization'}
          </p>
          <div className="mt-[1.2cqw] h-[0.1cqw] w-[9cqw] bg-gold-500" />
          <h3 className="mt-[1.6cqw] max-w-full truncate font-serif text-[3.9cqw] leading-none tracking-[0.06em] text-brand-900 uppercase">
            {certificateTitle || 'Certificate of Completion'}
          </h3>
          <p className="mt-[2.6cqw] text-[1.45cqw] text-slate-500 italic">This is to certify that</p>
          <p className="mt-[1cqw] max-w-full truncate font-serif text-[5.4cqw] leading-tight text-brand-900 italic">
            {recipientName || 'Recipient Name'}
          </p>
          <div className="mt-[0.4cqw] h-[0.1cqw] w-[46cqw] bg-gold-500" />
          <p className="mt-[1.6cqw] text-[1.45cqw] text-slate-500">has successfully completed</p>
          <p className="mt-[0.8cqw] max-w-full truncate text-[2.2cqw] font-bold text-slate-800">
            {courseName || 'Course or program name'}
          </p>
          {description && (
            <p className="mt-[1.2cqw] line-clamp-2 max-w-[64cqw] text-[1.2cqw] leading-snug text-slate-500">{description}</p>
          )}
        </div>

        <div className="absolute inset-x-[9cqw] bottom-[6.4cqw] flex items-end justify-between">
          <div className="text-left">
            <p className="text-[0.9cqw] font-bold tracking-[0.18em] text-slate-500 uppercase">Date of issue</p>
            <p className="mt-[0.4cqw] text-[1.6cqw] text-slate-800">{issueDate ? formatDate(issueDate, 'long') : '—'}</p>
            <p className="mt-[1.4cqw] text-[0.9cqw] font-bold tracking-[0.18em] text-slate-500 uppercase">Certificate ID</p>
            <p className="mt-[0.4cqw] font-mono text-[1.05cqw] text-brand-900">
              {certificateId ?? 'xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx'}
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex size-[6.4cqw] items-center justify-center rounded-full border-[0.18cqw] border-gold-500">
              <div className="flex size-[5.2cqw] flex-col items-center justify-center rounded-full border-[0.07cqw] border-gold-500 text-[0.72cqw] leading-tight font-bold tracking-wider text-gold-500">
                <span>VERIFIED</span>
                <span>CREDENTIAL</span>
              </div>
            </div>
            <div className="mt-[1.4cqw] h-[0.09cqw] w-[26cqw] bg-slate-800" />
            <p className="mt-[0.6cqw] text-[1.1cqw] font-bold text-slate-800">Authorized Signatory</p>
          </div>

          <div className="flex flex-col items-center">
            <div className="size-[11cqw]">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Verification QR code" className="size-full" />
              ) : (
                <MockQr seed={certificateId ?? recipientName} />
              )}
            </div>
            <p className="mt-[0.4cqw] text-[0.9cqw] font-bold tracking-[0.14em] text-brand-900">SCAN TO VERIFY</p>
          </div>
        </div>
      </div>
    </div>
  );
}
