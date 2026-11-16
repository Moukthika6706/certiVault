import { z } from 'zod';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const requiredText = (label: string, min: number, max: number) =>
  z
    .string({ message: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (label: string, max: number) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be at most ${max} characters`)
    .optional()
    .transform((v) => (v ? v : null));

export const loginSchema = z.object({
  email: z.string({ message: 'Email is required' }).trim().toLowerCase().regex(EMAIL_RE, 'Enter a valid email address'),
  password: z.string({ message: 'Password is required' }).min(1, 'Password is required').max(200),
});

export const issueCertificateSchema = z.object({
  mode: z.enum(['generate', 'upload'], { message: 'Choose "generate" or "upload"' }),
  recipientName: requiredText('Recipient name', 2, 120),
  recipientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || EMAIL_RE.test(v), 'Enter a valid recipient email'),
  certificateTitle: requiredText('Certificate title', 3, 120),
  courseName: requiredText('Course or program name', 2, 160),
  issuingOrganization: requiredText('Issuing organization', 2, 120),
  issueDate: z
    .string({ message: 'Issue date is required' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Issue date must be in YYYY-MM-DD format')
    .refine((v) => {
      const d = new Date(`${v}T00:00:00Z`);
      if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return false;
      const year = d.getUTCFullYear();
      return year >= 1950 && d.getTime() <= Date.now() + 366 * 24 * 3600 * 1000;
    }, 'Issue date is not a valid date'),
  description: optionalText('Description', 400),
});

export const revokeSchema = z.object({
  reason: optionalText('Reason', 300),
});

export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  status: z.enum(['ACTIVE', 'REVOKED']).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(100).catch(10),
});
