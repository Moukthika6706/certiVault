import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Ban, ChevronLeft, ChevronRight, Download, Eye, FilePlus, Files, Link2, Search, SearchX, X } from 'lucide-react';
import { RevokeDialog } from '../components/RevokeDialog';
import { Alert, Button, ButtonLink, Card, EmptyState, PageHeader, Skeleton, StatusBadge } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useDebounce } from '../hooks/useDebounce';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn, formatDate, shortId } from '../lib/format';
import { getErrorMessage } from '../services/api';
import { fetchCertificates, getAdminFileUrl, openSignedUrl } from '../services/certificateService';
import type { Certificate, CertificateStatus, Paginated } from '../types';

const PAGE_SIZE = 10;
const FILTERS: { label: string; value: CertificateStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'ACTIVE' },
  { label: 'Revoked', value: 'REVOKED' },
];

function IconAction({ label, onClick, children, danger, disabled }: { label: string; onClick: () => void; children: ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded-md p-1.5 text-slate-400 transition disabled:cursor-not-allowed disabled:opacity-30',
        danger ? 'hover:bg-red-50 hover:text-red-600' : 'hover:bg-slate-100 hover:text-slate-800',
      )}
    >
      {children}
    </button>
  );
}

export function CertificatesPage() {
  useDocumentTitle('Certificates');
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as CertificateStatus | null) ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [search, setSearch] = useState(params.get('q') ?? '');
  const debounced = useDebounce(search.trim(), 300);
  const [data, setData] = useState<Paginated<Certificate> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<Certificate | null>(null);

  const updateParams = useCallback(
    (next: Record<string, string | number | null>) => {
      const p = new URLSearchParams(params);
      Object.entries(next).forEach(([k, v]) => (v === null || v === '' || v === 1 && k === 'page' ? p.delete(k) : p.set(k, String(v))));
      setParams(p, { replace: true });
    },
    [params, setParams],
  );

  useEffect(() => {
    if ((params.get('q') ?? '') !== debounced) updateParams({ q: debounced || null, page: null });
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(
        await fetchCertificates({
          search: params.get('q') || undefined,
          status: status || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [params, status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const download = async (c: Certificate) => {
    try {
      const { url } = await getAdminFileUrl(c.certificateId, 'attachment');
      openSignedUrl(url, 'download');
    } catch (err) {
      toast.error('Download failed', getErrorMessage(err));
    }
  };

  const copyLink = async (c: Certificate) => {
    try {
      await navigator.clipboard.writeText(c.verificationUrl);
      toast.success('Verification link copied', c.verificationUrl);
    } catch {
      toast.error('Could not copy link');
    }
  };

  const from = data && data.total ? (data.page - 1) * data.pageSize + 1 : 0;
  const to = data ? Math.min(data.total, data.page * data.pageSize) : 0;
  const filtered = Boolean(params.get('q') || status);

  return (
    <>
      <PageHeader
        title="Certificates"
        description="Search, download and manage every certificate issued through CertiVault."
        actions={
          <ButtonLink to="/admin/issue" icon={<FilePlus className="size-4" />}>
            Issue certificate
          </ButtonLink>
        }
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
            <label htmlFor="cert-search" className="sr-only">Search certificates</label>
            <input
              id="cert-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by recipient name or certificate ID"
              className="h-10 w-full rounded-lg border-0 pr-9 pl-9 text-sm ring-1 ring-slate-200 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <div className="inline-flex rounded-lg bg-slate-100 p-1" role="tablist" aria-label="Filter by status">
            {FILTERS.map((f) => (
              <button
                key={f.label}
                role="tab"
                aria-selected={status === f.value}
                onClick={() => updateParams({ status: f.value || null, page: null })}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[13px] font-medium transition',
                  status === f.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="p-5">
            <Alert tone="error" title="Couldn't load certificates">
              {error}{' '}
              <button className="font-medium underline" onClick={load}>
                Try again
              </button>
            </Alert>
          </div>
        ) : !data || (loading && !data.items.length) ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : data.items.length === 0 ? (
          filtered ? (
            <EmptyState
              icon={<SearchX className="size-6" />}
              title="No matching certificates"
              description="Try a different name or ID, or clear the filters."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setParams({}, { replace: true });
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<Files className="size-6" />}
              title="No certificates issued yet"
              description="Issue a certificate and it will appear here."
              action={<ButtonLink to="/admin/issue" size="sm">Issue certificate</ButtonLink>}
            />
          )
        ) : (
          <div className={cn('overflow-x-auto transition-opacity', loading && 'opacity-60')}>
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <th className="px-5 py-3 font-medium">Certificate ID</th>
                  <th className="px-3 py-3 font-medium">Recipient</th>
                  <th className="hidden px-3 py-3 font-medium md:table-cell">Certificate title</th>
                  <th className="px-3 py-3 font-medium">Issue date</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((c) => (
                  <tr key={c.certificateId} className="group transition hover:bg-slate-50/70">
                    <td className="px-5 py-3">
                      <Link to={`/admin/certificates/${c.certificateId}`} className="font-mono text-[13px] text-brand-700 hover:underline" title={c.certificateId}>
                        {shortId(c.certificateId)}
                      </Link>
                    </td>
                    <td className="max-w-[200px] px-3 py-3">
                      <p className="truncate font-medium text-slate-900">{c.recipientName}</p>
                      {c.recipientEmail && <p className="truncate text-xs text-slate-500">{c.recipientEmail}</p>}
                    </td>
                    <td className="hidden max-w-[260px] px-3 py-3 md:table-cell">
                      <p className="truncate text-slate-900">{c.certificateTitle}</p>
                      <p className="truncate text-xs text-slate-500">{c.courseName}</p>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{formatDate(c.issueDate)}</td>
                    <td className="px-3 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        <Link
                          to={`/admin/certificates/${c.certificateId}`}
                          title="View details"
                          aria-label="View details"
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800"
                        >
                          <Eye className="size-4" />
                        </Link>
                        <IconAction label="Download PDF" onClick={() => download(c)}>
                          <Download className="size-4" />
                        </IconAction>
                        <IconAction label="Copy verification link" onClick={() => copyLink(c)}>
                          <Link2 className="size-4" />
                        </IconAction>
                        <IconAction label={c.status === 'REVOKED' ? 'Already revoked' : 'Revoke certificate'} onClick={() => setRevoking(c)} danger disabled={c.status === 'REVOKED'}>
                          <Ban className="size-4" />
                        </IconAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.total > 0 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3">
            <p className="text-[13px] text-slate-500">
              Showing <span className="font-medium text-slate-700">{from}</span>–<span className="font-medium text-slate-700">{to}</span> of{' '}
              <span className="font-medium text-slate-700">{data.total}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page <= 1 || loading}
                onClick={() => updateParams({ page: data.page - 1 })}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="px-2 text-[13px] text-slate-500 tabular-nums">
                {data.page} / {data.totalPages}
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={data.page >= data.totalPages || loading}
                onClick={() => updateParams({ page: data.page + 1 })}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <RevokeDialog
        certificate={revoking}
        onClose={() => setRevoking(null)}
        onRevoked={(updated) =>
          setData((d) => d && { ...d, items: d.items.map((x) => (x.certificateId === updated.certificateId ? updated : x)) })
        }
      />
    </>
  );
}
