# CertiVault

**Cloud-based certificate issuance and verification on Amazon Web Services.**

CertiVault lets an institution issue digital certificates, store them securely in **Amazon S3**, and lets anyone verify a certificate's authenticity in seconds with its unique ID or QR code. The application runs on **Amazon EC2**, reaches S3 through a least-privilege **IAM role**, and is monitored with **Amazon CloudWatch**.

> B.Tech Cloud Computing course project. The website is the product; the AWS infrastructure is the point.

![CertiVault AWS architecture](documentation/images/architecture.svg)

---

## Contents

- [Problem statement](#problem-statement)
- [Key features](#key-features)
- [Screenshots](#screenshots)
- [Technology stack](#technology-stack)
- [AWS services used](#aws-services-used)
- [Project structure](#project-structure)
- [Run locally](#run-locally)
- [Environment variables](#environment-variables)
- [AWS setup (S3, IAM, EC2, CloudWatch)](#aws-setup)
- [Deploy to EC2](#deploy-to-ec2)
- [API endpoints](#api-endpoints)
- [Security](#security)
- [Demonstration](#demonstration)
- [Future enhancements](#future-enhancements)

---

## Problem statement

Colleges and training organisations issue thousands of certificates, but managing them is still manual:

- Certificates can be **forged or edited** — a PDF proves nothing on its own.
- **Verification is slow**: employers email or phone the institution.
- Originals are **lost** on laptops and in drawers.
- There is **no central record** and **no way to revoke** a certificate issued in error.

**CertiVault** keeps the authoritative record in the cloud. Every certificate gets a UUID, a public verification URL and QR code, and a SHA-256 fingerprint; the PDF itself is kept in a private, encrypted, versioned S3 bucket.

## Key features

**Administrators**
- Secure sign-in (bcrypt + JWT), protected routes
- Dashboard with live totals (issued / active / revoked / this month) and a 6-month chart
- Issue certificates two ways: **generate** a professional PDF from a template (with embedded QR code), or **upload** an existing PDF
- Live certificate preview while filling the form
- Certificate management: search by name or ID, filter by status, pagination, download, copy link, revoke (with reason)
- Certificate details: storage location (S3 key + VersionId), SHA-256, **integrity check** against S3, embedded PDF preview, QR code
- **Cloud infrastructure** page showing live EC2 instance metadata, S3 health and the IAM role the SDK is using

**Public verifiers (no login)**
- Verify by **certificate ID** or by scanning the **QR code** → `VERIFIED`, `REVOKED` or `NOT FOUND`
- Download the certificate (active certificates only) via a **5-minute presigned S3 URL**
- **Upload a PDF** to check whether it is byte-for-byte identical to an issued certificate

## Screenshots

> Add your screenshots to `documentation/screenshots/` after deployment and link them here. The full checklist is in [documentation/demonstration.md](documentation/demonstration.md#screenshot-checklist-for-the-report).

| Page | File |
|---|---|
| Landing page | `documentation/screenshots/landing.png` |
| Admin dashboard | `documentation/screenshots/dashboard.png` |
| Issue certificate (live preview) | `documentation/screenshots/issue.png` |
| Certificate details | `documentation/screenshots/details.png` |
| Verification — VERIFIED / REVOKED | `documentation/screenshots/verify-verified.png`, `verify-revoked.png` |
| Generated certificate PDF | `documentation/screenshots/certificate-pdf.png` |
| S3 object · IAM role · EC2 · CloudWatch alarm | `documentation/screenshots/aws-*.png` |

## Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS v4, React Router, Axios, Lucide icons |
| Backend | Node.js 22 LTS, Express 5, TypeScript, AWS SDK for JavaScript v3, Multer, PDFKit, qrcode, zod, jsonwebtoken, bcryptjs, helmet, express-rate-limit |
| Database | SQLite (`better-sqlite3`) — metadata only; PDFs are never stored in the database |
| Cloud | Amazon EC2, Amazon S3, AWS IAM, Amazon CloudWatch |
| Server | Amazon Linux 2023, Nginx (reverse proxy + static hosting), PM2 (process manager) |

`bcryptjs` is a pure-JavaScript implementation of the same bcrypt algorithm — it avoids native compilation on EC2.

## AWS services used

| Service | Role in CertiVault | Configuration |
|---|---|---|
| **Amazon EC2** | Hosts Nginx, the React build and the Express API (IaaS) | Amazon Linux 2023, Free-Tier-eligible micro instance, Elastic IP, IMDSv2 |
| **Amazon S3** | Stores every certificate PDF | Private bucket, Block Public Access on, SSE-S3 encryption, versioning, HTTPS-only bucket policy, keys `certificates/<year>/<uuid>.pdf` |
| **AWS IAM** | Lets EC2 access *only* the CertiVault bucket | Role `CertiVault-EC2-Role` (instance profile) with `s3:PutObject`/`s3:GetObject` on `certificates/*` and `s3:ListBucket` — **no access keys anywhere** |
| **Amazon CloudWatch** | Monitors the server | EC2 `CPUUtilization` metric, alarm at ≥ 70 % for 10 min, optional SNS email |
| *Security group* | Network firewall | SSH 22 from your IP only; HTTP 80 / HTTPS 443 public; backend port 4000 **not** exposed |

Architecture, data flows and the database schema: [documentation/architecture.md](documentation/architecture.md).

## Project structure

```
certiVault/
├── backend/                       Express + TypeScript API
│   ├── src/
│   │   ├── config/                env validation, SQLite connection + schema
│   │   ├── controllers/           auth, certificates, verify, dashboard, system, files
│   │   ├── middleware/            JWT auth, Multer upload, rate limits, error handler
│   │   ├── models/                SQL queries + API mappers
│   │   ├── routes/                REST routes
│   │   ├── services/
│   │   │   ├── storage/           StorageService → S3StorageService | LocalStorageService (dev)
│   │   │   ├── certificateService.ts   issuance workflow, integrity checks
│   │   │   ├── pdfService.ts      PDFKit certificate template
│   │   │   ├── qrService.ts       QR codes
│   │   │   └── awsInfoService.ts  STS caller identity + EC2 IMDSv2 metadata
│   │   ├── utils/                 errors, hashing, validation schemas, logger
│   │   ├── app.ts                 Express app (helmet, CORS, JSON, routes)
│   │   └── server.ts              entry point
│   ├── scripts/                   create-admin.ts, check-aws.ts
│   ├── database/                  SQLite file (git-ignored)
│   └── .env.example
├── frontend/                      React + Vite + Tailwind
│   └── src/
│       ├── components/            UI kit, certificate preview, revoke dialog, route guard
│       ├── context/               auth + toast providers
│       ├── hooks/  layouts/  lib/  services/  types/
│       └── pages/                 Landing, Verify, Login, Dashboard, Issue, Certificates, Details, System
├── infrastructure/
│   ├── aws-policy/                IAM policy, EC2 trust policy, HTTPS-only bucket policy
│   ├── nginx/certivault.conf      reverse proxy + SPA config
│   └── deployment/                setup-ec2.sh, deploy.sh, ecosystem.config.cjs (PM2)
├── documentation/
│   ├── architecture.md            layers, connections, sequences, schema, API
│   ├── aws-setup.md               step-by-step AWS Console guide
│   ├── deployment.md              EC2 deployment + operations + troubleshooting
│   ├── demonstration.md           demo script + screenshot checklist
│   └── images/architecture.svg
└── README.md
```

## Run locally

Requirements: **Node.js 20.19+ or 22 LTS** (`node -v`) and Git. On macOS: `brew install node@22` or the installer from nodejs.org.

```bash
git clone https://github.com/Moukthika6706/certiVault.git
```

```bash
cd certiVault/backend && npm install && cp .env.example .env
```

Edit `backend/.env` and set `JWT_SECRET` (generate one with the command below). Leave `STORAGE_DRIVER=local` to start without AWS.

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create an administrator (you'll be prompted for a password):

```bash
npm run create-admin -- --name "Admin" --email admin@example.com
```

Start the API (port 4000):

```bash
npm run dev
```

In a second terminal, start the frontend (port 5173, proxies `/api` to the backend):

```bash
cd certiVault/frontend && npm install && npm run dev
```

Open http://localhost:5173.

> **Local storage is not AWS.** With `STORAGE_DRIVER=local`, PDFs are written to `backend/storage/`. The startup log, the database (`storage_backend = LOCAL`) and an amber banner in the admin UI all say so. Switch to `STORAGE_DRIVER=s3` to use Amazon S3.

### Test S3 from your laptop (optional)

Create an IAM user *only for local testing* with the same policy, run `aws configure --profile certivault`, then:

```bash
export AWS_PROFILE=certivault
```

Set `STORAGE_DRIVER=s3` and `S3_BUCKET_NAME` in `.env`, restart, and run `npm run check-aws`. On EC2 you never do this — the instance role supplies credentials. Delete the user's access key when done.

## Environment variables

`backend/.env` (template: [`backend/.env.example`](backend/.env.example)):

| Variable | Example | Purpose |
|---|---|---|
| `NODE_ENV` | `production` | Runtime mode |
| `HOST` / `PORT` | `127.0.0.1` / `4000` | API binds to localhost only; Nginx proxies to it |
| `JWT_SECRET` | 96 hex chars | Signs admin sessions and local download tokens (min 32 chars, required) |
| `JWT_EXPIRES_IN` | `8h` | Session lifetime |
| `DATABASE_PATH` | `./database/certivault.db` | SQLite file |
| `PUBLIC_APP_URL` | `http://13.233.x.x` | Base of verification URLs and QR codes |
| `CORS_ORIGINS` | `http://13.233.x.x` | Allowed browser origins |
| `TRUST_PROXY` | `true` | Behind Nginx: use `X-Forwarded-For` for rate limiting |
| `STORAGE_DRIVER` | `s3` | `s3` = Amazon S3, `local` = dev folder |
| `AWS_REGION` | `ap-south-1` | Bucket region |
| `S3_BUCKET_NAME` | `certivault-certificates-xyz` | Bucket name |
| `MAX_UPLOAD_MB` | `5` | PDF size limit |
| `PRESIGNED_URL_TTL_SECONDS` | `300` | Lifetime of download links |

There are **no AWS access-key variables** by design. The frontend has no secrets at all (`VITE_API_BASE_URL` is optional and defaults to `/api`).

## AWS setup

Full click-by-click guide with verification steps and screenshot list: **[documentation/aws-setup.md](documentation/aws-setup.md)**. Summary:

1. **S3** — create `certivault-certificates-<suffix>`: Block all public access ✅, Versioning **Enabled**, Default encryption **SSE-S3**, add the [HTTPS-only bucket policy](infrastructure/aws-policy/bucket-policy-https-only.json).
2. **IAM** — create policy `CertiVault-S3-Access` from [this JSON](infrastructure/aws-policy/certivault-s3-access-policy.json) (replace the bucket name), then role `CertiVault-EC2-Role` (trusted entity: EC2) with that policy.
3. **EC2** — launch Amazon Linux 2023 on a Free-Tier-eligible micro instance with key pair `certivault-key`, security group (SSH 22 = My IP, HTTP 80, HTTPS 443) and IAM instance profile `CertiVault-EC2-Role`. Associate an **Elastic IP**.
4. **CloudWatch** — alarm `CertiVault-High-CPU` on `CPUUtilization ≥ 70` for 2 × 5 min (optional SNS email).

## Deploy to EC2

Full guide: **[documentation/deployment.md](documentation/deployment.md)**. On the instance:

```bash
sudo dnf install -y git && git clone https://github.com/Moukthika6706/certiVault.git ~/certiVault
```

```bash
bash ~/certiVault/infrastructure/deployment/setup-ec2.sh
```

Create `backend/.env` (`NODE_ENV=production`, `STORAGE_DRIVER=s3`, bucket, `PUBLIC_APP_URL=http://<elastic-ip>`, `TRUST_PROXY=true`, new `JWT_SECRET`), then:

```bash
bash ~/certiVault/infrastructure/deployment/deploy.sh
```

```bash
cd ~/certiVault/backend && npm run check-aws:prod && npm run create-admin:prod -- --name "Admin" --email you@example.com
```

PM2 basics: `pm2 status`, `pm2 logs certivault-api`, `pm2 restart certivault-api`, `pm2 startup` + `pm2 save` for reboot persistence.

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | – | Health + storage backend |
| POST | `/api/auth/login` | – | Admin login → JWT (rate-limited) |
| GET | `/api/auth/me` | JWT | Current admin |
| GET | `/api/dashboard/stats` | JWT | Dashboard numbers |
| GET | `/api/system` | JWT | EC2 / S3 / IAM live status |
| GET | `/api/certificates` | JWT | List · `search`, `status`, `page`, `pageSize` |
| POST | `/api/certificates` | JWT | Issue (multipart, `mode=generate\|upload`, `file`) |
| GET | `/api/certificates/:id` | JWT | Details + QR code |
| GET | `/api/certificates/:id/download-url` | JWT | Presigned URL (`disposition=inline\|attachment`) |
| GET | `/api/certificates/:id/integrity` | JWT | Re-hash S3 object and compare |
| PATCH | `/api/certificates/:id/revoke` | JWT | Revoke with optional reason |
| GET | `/api/verify/:id` | – | `VERIFIED` / `REVOKED` / `NOT_FOUND` |
| GET | `/api/verify/:id/download-url` | – | Presigned URL (active only) |
| GET | `/api/verify/:id/integrity` | – | Public integrity check |
| POST | `/api/verify/file` | – | Upload PDF → authenticity by SHA-256 |

Public endpoints are rate-limited to 60 requests/minute per IP. Errors use `{ "error": { "code", "message", "fields"? } }`.

## Security

- **No AWS keys in code, `.env`, or the frontend.** EC2 gets temporary, auto-rotated credentials from its IAM role through IMDSv2; the SDK's default credential chain picks them up.
- **Least privilege** — the role can only `PutObject`/`GetObject` under `certificates/` and `ListBucket` on one bucket; no delete.
- **Private bucket** — Block Public Access, SSE-S3 at rest, HTTPS-only bucket policy, versioning against overwrites/deletes. Files are delivered only through **5-minute presigned URLs**.
- **Network** — only 80/443 public; SSH restricted to your IP; the API binds to `127.0.0.1` behind Nginx.
- **Authentication** — bcrypt (cost 12) password hashes, JWT sessions, constant-time-style login (dummy hash for unknown emails), login rate limit; admins created only via a server-side script.
- **Input handling** — zod validation on every write, Multer memory storage with a 5 MB limit, PDF signature (`%PDF-`) check, duplicate-file detection by hash.
- **Response hygiene** — public responses omit email, storage keys and internal IDs; unexpected errors return a generic message (details only in server logs); helmet security headers; strict CORS.
- **Repository hygiene** — `.env`, `*.pem`, databases, uploaded files and `node_modules` are git-ignored.

## Demonstration

The step-by-step end-to-end demo (issue → S3 object → private bucket → IAM role → EC2 → CloudWatch → QR verify → revoke → REVOKED) is in **[documentation/demonstration.md](documentation/demonstration.md)**, with a screenshot checklist for the report.

## Future enhancements

- HTTPS with a custom domain (Route 53 + Let's Encrypt or an Application Load Balancer + ACM)
- Amazon RDS (PostgreSQL) instead of SQLite; the model layer is already isolated
- CloudWatch Agent for memory/disk metrics and shipping PM2 logs to CloudWatch Logs
- Amazon SES to email certificates to recipients
- CloudFront in front of the static site
- Bulk issuance from CSV, multiple administrators with roles, audit log
- Infrastructure as Code (CloudFormation / Terraform) for one-command environment creation
