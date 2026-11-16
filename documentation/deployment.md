# Deploying CertiVault to EC2

Prerequisites: everything in [aws-setup.md](aws-setup.md) is done — bucket, IAM role attached to the instance, security group, Elastic IP — and you can SSH in.

```bash
ssh -i ~/.ssh/certivault-key.pem ec2-user@<ELASTIC-IP>
```

All commands below run **on the EC2 instance**.

## 1. Install system packages (once)

```bash
sudo dnf install -y git
```

```bash
git clone https://github.com/Moukthika6706/certiVault.git ~/certiVault
```

```bash
bash ~/certiVault/infrastructure/deployment/setup-ec2.sh
```

The script adds 1 GB of swap, installs Nginx, build tools, Node.js 22 LTS and PM2, and enables Nginx.

## 2. Confirm the IAM role works (no keys!)

```bash
TOKEN=$(curl -s -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
```

```bash
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

It should print `CertiVault-EC2-Role`. (If it prints nothing, attach the role: EC2 → Actions → Security → Modify IAM role.)

Note: we never run `aws configure` on the server and never create access keys.

## 3. Generate a JWT secret

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Copy the output.

## 4. Create `backend/.env`

```bash
cp ~/certiVault/backend/.env.example ~/certiVault/backend/.env
```

```bash
nano ~/certiVault/backend/.env
```

Set these values (leave the others as they are):

```ini
NODE_ENV=production
HOST=127.0.0.1
PORT=4000
JWT_SECRET=<paste the secret from step 3>
PUBLIC_APP_URL=http://<ELASTIC-IP>
CORS_ORIGINS=http://<ELASTIC-IP>
TRUST_PROXY=true
STORAGE_DRIVER=s3
AWS_REGION=ap-south-1
S3_BUCKET_NAME=<your bucket name>
```

Save with `Ctrl+O`, `Enter`, exit with `Ctrl+X`. Then lock the file down:

```bash
chmod 600 ~/certiVault/backend/.env
```

## 5. Build and start everything

```bash
bash ~/certiVault/infrastructure/deployment/deploy.sh
```

This installs dependencies, compiles the backend, builds the React app, copies it to `/var/www/certivault`, installs the Nginx site, and starts the API with PM2. It ends by printing `{"status":"ok","storage":"S3",...}`.

## 6. Prove the S3 integration from the server

```bash
cd ~/certiVault/backend && npm run check-aws:prod
```

Expected output:

```
1) AWS identity (default credential provider chain)
   ✔ arn:aws:sts::123456789012:assumed-role/CertiVault-EC2-Role/i-0abc...
   ✔ Using IAM role: CertiVault-EC2-Role
   ✔ Running on EC2 i-0abc... (t3.micro, ap-south-1a)
2) Bucket certivault-certificates-... (ap-south-1)
   ✔ Connected to Amazon S3 bucket "..." (ap-south-1)
3) Round trip (upload → download → hash compare)
   ✔ PutObject certificates/_healthcheck/check-aws-....pdf (VersionId ...)
   ✔ GetObject — SHA-256 matches
```

📸 Screenshot this output — it shows the role-based credentials and a real S3 round trip.

## 7. Create the administrator account

```bash
cd ~/certiVault/backend && npm run create-admin:prod -- --name "Your Name" --email you@example.com
```

You'll be asked for a password (hidden, min 10 characters). It is stored only as a bcrypt hash.

## 8. Make PM2 survive reboots

```bash
pm2 startup systemd -u ec2-user --hp /home/ec2-user
```

PM2 prints a `sudo env PATH=... pm2 startup ...` command — copy and run it. Then:

```bash
pm2 save
```

## 9. Open the site

Visit `http://<ELASTIC-IP>` in your browser → **Administrator Login** → issue a certificate → check the object in the S3 console.

---

## Day-to-day operations

| Task | Command |
|---|---|
| Process status | `pm2 status` |
| Live logs | `pm2 logs certivault-api` |
| Last 100 log lines | `pm2 logs certivault-api --lines 100 --nostream` |
| Restart API | `pm2 restart certivault-api` |
| Deploy latest code | `bash ~/certiVault/infrastructure/deployment/deploy.sh` |
| Nginx config test / reload | `sudo nginx -t && sudo systemctl reload nginx` |
| Nginx error log | `sudo tail -n 50 /var/log/nginx/error.log` |
| Back up the database | `cp ~/certiVault/backend/database/certivault.db ~/certivault-$(date +%F).db` |

## Troubleshooting

| Symptom | Likely cause → fix |
|---|---|
| Browser can't reach the site | Security group missing HTTP 80, or you're using an old IP. Check `sudo systemctl status nginx`. |
| Nginx default "Welcome" page | Site config not installed or stock default server still active → rerun `deploy.sh` (it copies the config) and `setup-ec2.sh` (removes the stock `default_server`). |
| `502 Bad Gateway` on `/api/...` | API not running → `pm2 status`, `pm2 logs certivault-api`. Often a bad `.env` value; the log names it. |
| `JWT_SECRET is missing or too short` | Set a 32+ character secret in `backend/.env`, then `pm2 restart certivault-api`. |
| Issuing fails with *not authorised to access certificate storage* | IAM policy has the wrong bucket name or the role isn't attached. Re-check section 2 of aws-setup.md; run `npm run check-aws:prod`. |
| *The server has no AWS credentials* | Role not attached to the instance (EC2 → Actions → Security → Modify IAM role). |
| QR codes point to `localhost` | `PUBLIC_APP_URL` not updated. Fix `.env`, restart PM2. Existing certificates keep the old URL — reissue them. |
| `npm ci` killed / out of memory | Swap missing → rerun `setup-ec2.sh`. |
| `better-sqlite3` build error | Build tools missing → `sudo dnf install -y gcc-c++ make python3`, rerun `deploy.sh`. |

## Optional: HTTPS

HTTPS needs a **domain name** pointing (DNS *A record*) at the Elastic IP — certificate authorities don't issue normal certificates for bare EC2 IPs. With a domain:

```bash
sudo dnf install -y certbot python3-certbot-nginx
```

```bash
sudo certbot --nginx -d certivault.yourdomain.com
```

Then set `PUBLIC_APP_URL=https://certivault.yourdomain.com` and `CORS_ORIGINS` to match, and `pm2 restart certivault-api`. Port 443 is already open in the security group.
