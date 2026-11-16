import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { config } from './env';

/**
 * SQLite stores certificate METADATA only (names, dates, status, S3 object key,
 * SHA-256 hash). The PDF files themselves live in Amazon S3.
 *
 * All SQL lives in src/models, so swapping SQLite for PostgreSQL / Amazon RDS
 * later only requires changing this file and the model implementations.
 */
fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

export const db = new Database(config.databasePath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS admins (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT    NOT NULL,
  email          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash  TEXT    NOT NULL,
  created_at     TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS certificates (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id        TEXT    NOT NULL UNIQUE,
  recipient_name        TEXT    NOT NULL,
  recipient_email       TEXT,
  certificate_title     TEXT    NOT NULL,
  course_name           TEXT    NOT NULL,
  issuing_organization  TEXT    NOT NULL,
  issue_date            TEXT    NOT NULL,
  description           TEXT,
  source                TEXT    NOT NULL CHECK (source IN ('GENERATED', 'UPLOADED')),
  status                TEXT    NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  storage_backend       TEXT    NOT NULL CHECK (storage_backend IN ('S3', 'LOCAL')),
  s3_object_key         TEXT    NOT NULL,
  storage_version_id    TEXT,
  sha256_hash           TEXT    NOT NULL,
  file_size_bytes       INTEGER NOT NULL,
  verification_url      TEXT    NOT NULL,
  issued_by             INTEGER REFERENCES admins(id),
  revocation_reason     TEXT,
  created_at            TEXT    NOT NULL,
  updated_at            TEXT    NOT NULL,
  revoked_at            TEXT
);

CREATE INDEX IF NOT EXISTS idx_certificates_status    ON certificates (status);
CREATE INDEX IF NOT EXISTS idx_certificates_recipient ON certificates (recipient_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_certificates_sha256    ON certificates (sha256_hash);
CREATE INDEX IF NOT EXISTS idx_certificates_created   ON certificates (created_at);
`;

db.exec(SCHEMA);
