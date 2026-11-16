import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ban, CircleCheck, CloudCog, FilePlus, Files, RefreshCw, Sparkles } from 'lucide-react';
import { Alert, Button, ButtonLink, Card, CardHeader, EmptyState, PageHeader, Skeleton, StatusBadge, StorageBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn, formatDate } from '../lib/format';
import { getErrorMessage } from '../services/api';
import { fetchDashboardStats } from '../services/certificateService';
import type { DashboardStats } from '../types';

function StatCard({ label, value, icon, tone, hint }: { label: string; value?: number; icon: ReactNode; tone: string; hint?: string }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={cn('flex size-8 items-center justify-center rounded-lg', tone)}>{icon}</span>
      </div>
      {value === undefined ? (
        <Skeleton className="mt-3 h-8 w-16" />
      ) : (
        <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{value.toLocaleString()}</p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </Card>
  );
}

function MonthlyChart({ data }: { data: DashboardStats['monthly'] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-48 items-end gap-3 px-1 sm:gap-5" role="img" aria-label="Certificates issued per month">
      {data.map((d) => {
        const label = new Date(`${d.month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
        return (
          <div key={d.month} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-xs font-medium text-slate-500 tabular-nums">{d.count}</span>
            <div
              className="w-full max-w-12 rounded-t-md bg-brand-800 transition group-hover:bg-brand-600"
              style={{ height: `${Math.max(3, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.18 }}
            />
            <span className="text-xs text-slate-400">{label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  useDocumentTitle('Dashboard');
  const { admin } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await fetchDashboardStats());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const firstName = admin?.name.split(' ')[0] ?? 'there';

  return (
    <>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description="Here's an overview of the certificates issued through CertiVault."
        actions={
          <>
            <Button variant="secondary" onClick={load} loading={loading} icon={<RefreshCw className="size-4" />}>
              Refresh
            </Button>
            <ButtonLink to="/admin/issue" icon={<FilePlus className="size-4" />}>
              Issue certificate
            </ButtonLink>
          </>
        }
      />

      {error && (
        <Alert tone="error" title="Couldn't load dashboard" className="mb-6">
          {error}
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total issued" value={stats?.total} icon={<Files className="size-4" />} tone="bg-brand-50 text-brand-700" />
        <StatCard label="Active" value={stats?.active} icon={<CircleCheck className="size-4" />} tone="bg-emerald-50 text-emerald-700" />
        <StatCard label="Revoked" value={stats?.revoked} icon={<Ban className="size-4" />} tone="bg-red-50 text-red-700" />
        <StatCard label="This month" value={stats?.issuedThisMonth} icon={<Sparkles className="size-4" />} tone="bg-amber-50 text-amber-700" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="Certificates issued" description="Last six months" />
          <div className="p-5 sm:p-6">{stats ? <MonthlyChart data={stats.monthly} /> : <Skeleton className="h-48 w-full" />}</div>
        </Card>

        <div className="flex flex-col gap-6">
          <div className="relative overflow-hidden rounded-2xl bg-brand-950 p-6 text-white shadow-sm">
            <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-brand-700/40 blur-2xl" aria-hidden />
            <FilePlus className="relative size-6 text-gold-400" />
            <h3 className="relative mt-4 text-lg font-semibold">Issue a new certificate</h3>
            <p className="relative mt-1 text-sm text-brand-200/80">
              Generate a PDF with an embedded QR code, or register an existing PDF. Files go straight to S3.
            </p>
            <Link
              to="/admin/issue"
              className="relative mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-white hover:text-gold-300"
            >
              Start issuing <ArrowRight className="size-4" />
            </Link>
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <CloudCog className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-900">Certificate storage</p>
                <div className="mt-0.5">{stats ? <StorageBadge backend={stats.storageBackend} /> : <Skeleton className="h-5 w-24" />}</div>
              </div>
              <Link to="/admin/system" className="text-sm font-medium text-brand-700 hover:underline">
                Details
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Recent certificates"
          action={
            <Link to="/admin/certificates" className="text-sm font-medium text-brand-700 hover:underline">
              View all
            </Link>
          }
        />
        {!stats ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : stats.recent.length === 0 ? (
          <EmptyState
            icon={<Files className="size-6" />}
            title="No certificates yet"
            description="Certificates you issue will appear here."
            action={<ButtonLink to="/admin/issue" size="sm">Issue your first certificate</ButtonLink>}
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {stats.recent.map((c) => (
              <li key={c.certificateId}>
                <Link
                  to={`/admin/certificates/${c.certificateId}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50 sm:px-6"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-sm font-semibold text-brand-700">
                    {c.recipientName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{c.recipientName}</p>
                    <p className="truncate text-[13px] text-slate-500">
                      {c.certificateTitle} · {c.courseName}
                    </p>
                  </div>
                  <span className="hidden text-[13px] text-slate-500 sm:block">{formatDate(c.issueDate)}</span>
                  <StatusBadge status={c.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
