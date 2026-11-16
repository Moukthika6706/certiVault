import { db } from '../config/database';

export interface AdminRow {
  id: number;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export function findAdminByEmail(email: string): AdminRow | undefined {
  return db.prepare('SELECT * FROM admins WHERE email = ?').get(email.trim()) as AdminRow | undefined;
}

export function findAdminById(id: number): AdminRow | undefined {
  return db.prepare('SELECT * FROM admins WHERE id = ?').get(id) as AdminRow | undefined;
}

export function createAdmin(input: { name: string; email: string; passwordHash: string }): AdminRow {
  const result = db
    .prepare('INSERT INTO admins (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)')
    .run(input.name.trim(), input.email.trim().toLowerCase(), input.passwordHash, new Date().toISOString());
  return findAdminById(Number(result.lastInsertRowid))!;
}

export function updateAdminPassword(id: number, passwordHash: string): void {
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}

export function countAdmins(): number {
  return (db.prepare('SELECT COUNT(*) AS n FROM admins').get() as { n: number }).n;
}
