import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { config } from '../config/env';
import { signSessionToken } from '../middleware/auth';
import { findAdminByEmail } from '../models/adminModel';
import { AppError } from '../utils/errors';
import { loginSchema } from '../utils/validation';

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('certivault-timing-equaliser', 10);

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body ?? {});
  const admin = findAdminByEmail(email);
  const valid = await bcrypt.compare(password, admin?.password_hash ?? DUMMY_HASH);

  if (!admin || !valid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  res.json({
    token: signSessionToken(admin),
    expiresIn: config.jwtExpiresIn,
    admin: { id: admin.id, name: admin.name, email: admin.email },
  });
}

export function me(req: Request, res: Response) {
  res.json({ admin: req.admin });
}
