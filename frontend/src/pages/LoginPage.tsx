import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CircleX, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Alert, Button, Input } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../services/api';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function LoginPage() {
  useDocumentTitle('Administrator sign in');
  const { login, status } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to={from} replace />;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const next: typeof errors = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to sign in. Please try again.'));
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-brand-950 p-12 text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(50%_40%_at_20%_10%,rgba(93,128,200,0.35),transparent_70%),radial-gradient(40%_40%_at_90%_90%,rgba(201,166,90,0.18),transparent_70%)]"
          aria-hidden
        />
        <Link to="/" className="relative">
          <Logo light />
        </Link>
        <div className="relative mt-auto max-w-md">
          <h2 className="font-serif text-4xl leading-tight italic">
            “Every certificate issued here can be checked by anyone, anywhere, in seconds.”
          </h2>
          <ul className="mt-10 space-y-4 text-sm text-brand-200/85">
            {[
              'Issue certificates with embedded verification QR codes',
              'PDFs stored privately in encrypted Amazon S3 storage',
              'Revoke instantly — verifiers see the change immediately',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="flex flex-col bg-white px-4 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <Link to="/" className="ml-auto inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
            <ArrowLeft className="size-4" /> Back to site
          </Link>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
            <Lock className="size-5" />
          </span>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">Administrator sign in</h1>
          <p className="mt-1.5 text-sm text-slate-500">Sign in to issue and manage certificates.</p>

          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            {formError && <Alert tone="error" title={formError} icon={<CircleX className="size-4" />} />}

            <Input
              label="Email address"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              leading={<Mail className="size-4" />}
              placeholder="admin@institution.edu"
              autoFocus
            />

            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              leading={<Lock className="size-4" />}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="rounded-md p-2 text-slate-400 transition hover:text-slate-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              }
            />

            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-8 text-center text-[13px] text-slate-400">
            Administrator accounts are created on the server with <code className="font-mono">npm run create-admin</code>.
          </p>
        </div>
      </main>
    </div>
  );
}
