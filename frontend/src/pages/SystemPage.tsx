import { useEffect, useState, type ReactNode } from 'react';
import { CircleCheck, CircleX, Database, ExternalLink, Gauge, KeyRound, RefreshCw, Server, TriangleExclamationPoint } from 'lucide-react';
import { Alert, Button, Card, PageHeader, Skeleton } from '../components/ui';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cn, formatDuration } from '../lib/format';
import { getErrorMessage } from '../services/api';
import { fetchSystemInfo } from '../services/certificateService';
import type { SystemInfo } from '../types';

type Tone = 'ok' | 'warn' | 'off';

function ServiceCard({
  icon,
  service,
  role,
  status,
  statusLabel,
  consoleUrl,
  children,
}: {
  icon: ReactNode;
  service: string;
  role: string;
  status: Tone;
  statusLabel: string;
  consoleUrl?: string;
  children: ReactNode;
}) {
  const tone = {
    ok: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15',
    warn: 'bg-amber-50 text-amber-800 ring-amber-600/20',
    off: 'bg-slate-100 text-slate-600 ring-slate-500/15',
  }[status];
  const Icon = status === 'ok' ? CircleCheck : status === 'warn' ? TriangleExclamationPoint : CircleX;

  return (
    <Card className="flex flex-col">
      <div className="flex items-start justify-between gap-3 p-5">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-600/10">{icon}</span>
          <div>
            <h2 className="font-semibold text-slate-900">{service}</h2>
            <p className="text-[13px] text-slate-500">{role}</p>
          </div>
        </div>
        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset', tone)}>
          <Icon className="size-3.5" />
          {statusLabel}
        </span>
      </div>
      <dl className="flex-1 space-y-2.5 border-t border-slate-100 px-5 py-4 text-sm">{children}</dl>
      {consoleUrl && (
        <a
          href={consoleUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 border-t border-slate-100 px-5 py-3 text-[13px] font-medium text-brand-700 hover:bg-slate-50"
        >
          Open in AWS Console <ExternalLink className="size-3.5" />
        </a>
      )}
    </Card>
  );
}

function Row({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cn('min-w-0 break-all text-slate-900', mono && 'font-mono text-[12.5px]')}>{value ?? '—'}</dd>
    </div>
  );
}

export function SystemPage() {
  useDocumentTitle('Cloud infrastructure');
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setInfo(await fetchSystemInfo());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <PageHeader
        title="Cloud infrastructure"
        description="Live status of the AWS services CertiVault depends on, read from the running server."
        actions={
          <Button variant="secondary" onClick={load} loading={loading} icon={<RefreshCw className="size-4" />}>
            Refresh
          </Button>
        }
      />

      {error && <Alert tone="error" title="Couldn't load infrastructure status" className="mb-6">{error}</Alert>}

      {!info ? (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <ServiceCard
              icon={<Server className="size-5" />}
              service="Amazon EC2"
              role="Compute — hosts Nginx, the React app and the Node.js API"
              status={info.ec2 ? 'ok' : 'off'}
              statusLabel={info.ec2 ? 'Running on EC2' : 'Not on EC2'}
              consoleUrl={info.consoleLinks.ec2}
            >
              {info.ec2 ? (
                <>
                  <Row label="Instance ID" value={info.ec2.instanceId} mono />
                  <Row label="Instance type" value={info.ec2.instanceType} mono />
                  <Row label="Availability Zone" value={info.ec2.availabilityZone} mono />
                  <Row label="Public IPv4" value={info.ec2.publicIpv4} mono />
                </>
              ) : (
                <p className="text-slate-500">
                  The instance metadata service (IMDSv2) is not reachable, so this server is not an EC2 instance — most
                  likely a local development machine.
                </p>
              )}
            </ServiceCard>

            <ServiceCard
              icon={<Database className="size-5" />}
              service="Amazon S3"
              role="Storage — private, encrypted, versioned certificate PDFs"
              status={info.storage.backend === 'S3' ? (info.storage.healthy ? 'ok' : 'warn') : 'warn'}
              statusLabel={info.storage.backend === 'S3' ? (info.storage.healthy ? 'Connected' : 'Unreachable') : 'Local dev storage'}
              consoleUrl={info.consoleLinks.s3}
            >
              <Row label="Backend" value={info.storage.backend === 'S3' ? 'Amazon S3' : 'Local folder (not AWS)'} />
              <Row label="Bucket" value={info.storage.bucket} mono />
              <Row label="Region" value={info.storage.region} mono />
              <Row label="Health check" value={info.storage.message} />
            </ServiceCard>

            <ServiceCard
              icon={<KeyRound className="size-5" />}
              service="AWS IAM"
              role="Identity — least-privilege access from EC2 to S3"
              status={info.iam.identity?.roleName ? 'ok' : info.iam.identity ? 'warn' : 'off'}
              statusLabel={info.iam.identity?.roleName ? 'Instance role' : info.iam.identity ? 'Not a role' : 'No credentials'}
              consoleUrl={info.consoleLinks.iam}
            >
              {info.iam.identity ? (
                <>
                  <Row label="Role" value={info.iam.identity.roleName ?? 'Not an assumed role'} mono />
                  <Row label="Caller ARN" value={info.iam.identity.arn} mono />
                  <Row
                    label="Credentials"
                    value={
                      info.iam.identity.roleName
                        ? 'Temporary, auto-rotated credentials from the EC2 instance profile. No access keys on disk.'
                        : 'Static credentials (IAM user / CLI profile). On EC2, use an instance role instead.'
                    }
                  />
                </>
              ) : (
                <p className="text-slate-500">
                  {info.iam.error ?? 'No AWS credentials found.'} On EC2, attach the CertiVault IAM role to the instance.
                </p>
              )}
            </ServiceCard>

            <ServiceCard
              icon={<Gauge className="size-5" />}
              service="Amazon CloudWatch"
              role="Monitoring — EC2 metrics and a CPU utilisation alarm"
              status={info.ec2 ? 'ok' : 'off'}
              statusLabel={info.ec2 ? 'Metrics available' : 'EC2 only'}
              consoleUrl={info.consoleLinks.cloudwatch}
            >
              <Row label="Metrics" value="CPUUtilization, NetworkIn/Out, StatusCheckFailed (AWS/EC2)" />
              <Row label="Alarm" value="CertiVault-High-CPU — CPU ≥ 70% for 2 × 5 min" />
              <Row label="Note" value="Memory and disk metrics require the CloudWatch Agent; they are not collected by default." />
            </ServiceCard>
          </div>

          <Card className="mt-6 p-5">
            <h2 className="font-semibold text-slate-900">Application</h2>
            <dl className="mt-4 grid gap-x-8 gap-y-2.5 text-sm sm:grid-cols-2">
              <Row label="Version" value={`${info.app.name} ${info.app.version}`} />
              <Row label="Environment" value={info.app.environment} mono />
              <Row label="Node.js" value={info.app.nodeVersion} mono />
              <Row label="Uptime" value={formatDuration(info.app.uptimeSeconds)} />
              <Row label="Public URL" value={info.app.publicAppUrl} mono />
            </dl>
          </Card>
        </>
      )}
    </>
  );
}
