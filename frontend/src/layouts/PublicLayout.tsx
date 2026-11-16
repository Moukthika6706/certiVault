import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Logo } from '../components/Logo';
import { ButtonLink } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/format';

const NAV = [
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Features', href: '/#features' },
  { label: 'Cloud architecture', href: '/#architecture' },
];

export function PublicLayout() {
  const [open, setOpen] = useState(false);
  const { status } = useAuth();
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }, [location.hash, location.pathname]);

  const adminCta =
    status === 'authenticated' ? (
      <ButtonLink to="/admin" variant="secondary" size="sm">
        Dashboard
      </ButtonLink>
    ) : (
      <ButtonLink to="/admin/login" variant="secondary" size="sm">
        Administrator login
      </ButtonLink>
    );

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="CertiVault home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="rounded-lg px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
            <NavLink
              to="/verify"
              className={({ isActive }) =>
                cn(
                  'rounded-lg px-3 py-2 text-sm transition hover:bg-slate-50 hover:text-slate-900',
                  isActive ? 'font-medium text-slate-900' : 'text-slate-600',
                )
              }
            >
              Verify
            </NavLink>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {adminCta}
            <ButtonLink to="/verify" size="sm">
              Verify a certificate
            </ButtonLink>
          </div>

          <button
            className="-mr-2 rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>

        {open && (
          <div className="animate-fade-in border-t border-slate-100 bg-white px-4 pt-2 pb-4 md:hidden">
            <nav className="flex flex-col" aria-label="Mobile">
              {[...NAV, { label: 'Verify a certificate', href: '/verify' }].map((item) => (
                <Link key={item.href} to={item.href} className="rounded-lg px-3 py-2.5 text-[15px] text-slate-700 hover:bg-slate-50">
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-3 border-t border-slate-100 pt-3">{adminCta}</div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/70 bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-3 max-w-sm text-sm text-slate-500">
              A secure, cloud-based platform for issuing, storing and verifying digital certificates — built on Amazon
              Web Services.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Platform</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li><Link className="hover:text-slate-900" to="/verify">Verify a certificate</Link></li>
              <li><Link className="hover:text-slate-900" to="/#how-it-works">How verification works</Link></li>
              <li><Link className="hover:text-slate-900" to="/admin/login">Administrator login</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Infrastructure</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-500">
              <li>Amazon EC2 — application hosting</li>
              <li>Amazon S3 — encrypted storage</li>
              <li>AWS IAM · Amazon CloudWatch</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-200/70">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-slate-400 sm:px-6">
            © {new Date().getFullYear()} CertiVault · B.Tech Cloud Computing course project
          </p>
        </div>
      </footer>
    </div>
  );
}
