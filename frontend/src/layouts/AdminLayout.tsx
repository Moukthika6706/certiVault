import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CloudCog, ExternalLink, FilePlus, Files, LayoutDashboard, LogOut, Menu, TriangleExclamationPoint, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/format';
import { fetchHealth } from '../services/certificateService';
import type { StorageBackend } from '../types';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/issue', label: 'Issue certificate', icon: FilePlus },
  { to: '/admin/certificates', label: 'Certificates', icon: Files },
  { to: '/admin/system', label: 'Cloud infrastructure', icon: CloudCog },
];

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-full flex-col bg-brand-950 text-brand-100">
      <div className="flex h-16 items-center px-5">
        <Link to="/admin" onClick={onNavigate}>
          <Logo light />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4" aria-label="Admin">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive ? 'bg-white/10 text-white' : 'text-brand-200/80 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <Icon className="size-[18px]" aria-hidden />
            {label}
          </NavLink>
        ))}

        <div className="pt-4">
          <p className="px-3 pb-2 text-[11px] font-semibold tracking-wider text-brand-300/50 uppercase">Public</p>
          <Link
            to="/verify"
            target="_blank"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-200/80 transition hover:bg-white/5 hover:text-white"
          >
            <ExternalLink className="size-[18px]" aria-hidden />
            Verification page
          </Link>
        </div>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
            {admin?.name?.charAt(0).toUpperCase() ?? 'A'}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{admin?.name}</p>
            <p className="truncate text-xs text-brand-300/70">{admin?.email}</p>
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/admin/login', { replace: true });
            }}
            className="rounded-md p-2 text-brand-300/70 transition hover:bg-white/10 hover:text-white"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [storage, setStorage] = useState<StorageBackend | null>(null);
  const location = useLocation();

  useEffect(() => setMobileOpen(false), [location.pathname]);
  useEffect(() => {
    fetchHealth()
      .then((h) => setStorage(h.storage))
      .catch(() => setStorage(null));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/50" onClick={() => setMobileOpen(false)} />
          <div className="relative h-full w-72 max-w-[85vw] animate-slide-up">
            <Sidebar onNavigate={() => setMobileOpen(false)} />
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 rounded-md p-1.5 text-brand-200 hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
          <button
            onClick={() => setMobileOpen(true)}
            className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
          <Logo />
        </header>

        {storage === 'LOCAL' && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 sm:px-8">
            <p className="flex items-start gap-2 text-[13px] text-amber-900">
              <TriangleExclamationPoint className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <strong className="font-semibold">Local development storage.</strong> Certificate files are being saved on
                this machine, <em>not</em> in Amazon S3. Set <code className="font-mono text-xs">STORAGE_DRIVER=s3</code>{' '}
                to use AWS.
              </span>
            </p>
          </div>
        )}

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-8 sm:py-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
