import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { findAdminById } from '../models/adminModel';
import { AppError } from '../utils/errors';

export interface SessionToken {
  sub: string;
  email: string;
  purpose: 'admin-session';
}

export function signSessionToken(admin: { id: number; email: string }): string {
  const payload: SessionToken = { sub: String(admin.id), email: admin.email, purpose: 'admin-session' };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/** Protects administrator APIs: requires `Authorization: Bearer <JWT>`. */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Please sign in to continue'));
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as SessionToken;
    if (decoded.purpose !== 'admin-session') throw new Error('wrong token purpose');
    const admin = findAdminById(Number(decoded.sub));
    if (!admin) throw new Error('admin no longer exists');
    req.admin = { id: admin.id, email: admin.email, name: admin.name };
    next();
  } catch {
    next(new AppError(401, 'SESSION_EXPIRED', 'Your session has expired. Please sign in again'));
  }
}
