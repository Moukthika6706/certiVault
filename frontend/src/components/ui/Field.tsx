import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '../../lib/format';

const CONTROL =
  'block w-full rounded-lg border-0 bg-white px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 transition placeholder:text-slate-400 focus:ring-2 focus:ring-brand-500 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500';

interface FieldShellProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldShell({ label, htmlFor, error, hint, optional, children, className }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 flex items-baseline justify-between text-sm font-medium text-slate-700">
        <span>{label}</span>
        {optional && <span className="text-xs font-normal text-slate-400">Optional</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-[13px] text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[13px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  wrapperClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, optional, leading, trailing, wrapperClassName, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} htmlFor={inputId} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      <div className="relative">
        {leading && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">{leading}</span>
        )}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(
            CONTROL,
            'h-10',
            !!leading && 'pl-9',
            !!trailing && 'pr-10',
            error && 'ring-red-300 focus:ring-red-500',
            className,
          )}
          {...rest}
        />
        {trailing && <span className="absolute inset-y-0 right-1 flex items-center">{trailing}</span>}
      </div>
    </FieldShell>
  );
});

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  wrapperClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, optional, wrapperClassName, className, id, ...rest },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <FieldShell label={label} htmlFor={inputId} error={error} hint={hint} optional={optional} className={wrapperClassName}>
      <textarea
        ref={ref}
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, 'min-h-24 resize-y py-2.5', error && 'ring-red-300 focus:ring-red-500', className)}
        {...rest}
      />
    </FieldShell>
  );
});
