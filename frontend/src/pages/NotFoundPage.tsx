import { ArrowLeft, SearchX } from 'lucide-react';
import { ButtonLink } from '../components/ui';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export function NotFoundPage() {
  useDocumentTitle('Page not found');
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <span className="flex size-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
        <SearchX className="size-6" />
      </span>
      <p className="mt-6 font-mono text-sm text-slate-400">404</p>
      <h1 className="mt-1 text-2xl font-semibold text-slate-900">Page not found</h1>
      <p className="mt-2 text-slate-500">The page you’re looking for doesn’t exist or has moved.</p>
      <ButtonLink to="/" variant="secondary" className="mt-8" icon={<ArrowLeft className="size-4" />}>
        Back to home
      </ButtonLink>
    </div>
  );
}
