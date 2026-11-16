# End-to-End Demonstration Script

A ~10-minute walkthrough for the project evaluation. Open two browser tabs before you start: the **CertiVault site** (`http://<ELASTIC-IP>`) and the **AWS Management Console** (correct region selected).

| # | Where | Do this | Say this |
|---|---|---|---|
| 1 | Website | Open the landing page. Scroll to *Cloud architecture*. | "CertiVault is hosted on EC2, stores PDFs in S3, accesses S3 through an IAM role, and is monitored by CloudWatch." |
| 2 | Website | **Administrator Login** → sign in. | "Admin APIs are protected with JWT; passwords are bcrypt-hashed." |
| 3 | Website | **Cloud infrastructure** page. | "This is live data from the server: the EC2 instance ID from instance metadata, the S3 bucket health check, and the IAM role ARN the SDK is using — no access keys." |
| 4 | Website | **Issue certificate** → *Generate from template* → fill the form → **Generate & issue**. | "The backend generates a UUID, a verification URL and QR code, renders the PDF, computes its SHA-256 and uploads it to S3." |
| 5 | Website | On the success screen point at the **object key**, **VersionId** and **SHA-256**. Click **View details** → show the PDF preview. | "The preview is served through a presigned URL that expires in 5 minutes." |
| 6 | AWS Console | **S3 → bucket → certificates/ → 2026/** → click the new `<uuid>.pdf`. Show *Properties* → *Server-side encryption: SSE-S3*, *Metadata* (`x-amz-meta-sha256`), and *Versions*. | "The object key prefix acts like a folder. Encryption and the hash metadata are visible here." |
| 7 | AWS Console | Copy the object's **Object URL** and open it in a new tab → **AccessDenied**. Show *Permissions → Block all public access: On*. | "The bucket is private. The only way to get a file is a short-lived signed URL from our backend." |
| 8 | AWS Console | **EC2 → Instances → certivault-server**: Running, 3/3 checks; *Details* → **IAM Role: CertiVault-EC2-Role**; *Security* → inbound rules. | "Port 4000 isn't open — Nginx proxies `/api` to localhost." |
| 9 | AWS Console | **IAM → Roles → CertiVault-EC2-Role** → Permissions → the policy JSON. | "Least privilege: only Put/Get on `certificates/*` and ListBucket on this one bucket." |
| 10 | AWS Console | **CloudWatch → Alarms → CertiVault-High-CPU** and **EC2 → Monitoring** graphs. | "Metrics vs logs vs alarms… memory needs the CloudWatch Agent." |
| 11 | Phone | Scan the QR code on the PDF (or open the verification link). | "The QR only points to the verification page; the decision comes from the database." |
| 12 | Website | Result: **Certificate Verified Successfully**. Click **Run check** under *Stored file integrity*. | "We re-download the object from S3, hash it and compare with the stored hash — they match." |
| 13 | Website | **Verify → Upload PDF**: upload the downloaded PDF → *Authentic document*. Then upload any other PDF → *No matching certificate*. | "Any change to the file changes its SHA-256." |
| 14 | Website | Admin → **Certificates** → search the recipient → **Revoke** → give a reason → confirm. | |
| 15 | Website / phone | Refresh the verification page → **Certificate Revoked**; download is disabled. | "Revocation is instant because verification is always a live lookup." |

## Screenshot checklist for the report

**AWS**
- [ ] Region selector + Zero-spend budget
- [ ] S3: bucket list · Block Public Access On · Versioning Enabled · Default encryption SSE-S3 · bucket policy
- [ ] S3: a certificate object (key, encryption, metadata) · *Show versions* demo
- [ ] S3: AccessDenied when opening the object URL directly
- [ ] IAM: policy JSON · role permissions · trust relationship
- [ ] EC2: instance Running + 3/3 checks · Details (IAM role, type, AMI) · Security group inbound rules · Elastic IP
- [ ] Terminal: SSH session · `npm run check-aws:prod` output · `pm2 status`
- [ ] CloudWatch: CPU metric graph · alarm (OK / In alarm)

**Application**
- [ ] Landing page (hero + architecture section)
- [ ] Login page · dashboard
- [ ] Issue form with live preview · success screen (object key, VersionId, hash, QR)
- [ ] Certificates table with search/filter
- [ ] Certificate details (storage & integrity, PDF preview)
- [ ] Cloud infrastructure page on EC2
- [ ] Verification: VERIFIED · REVOKED · NOT FOUND · file check (authentic / no match)
- [ ] Generated certificate PDF
- [ ] Mobile view of the verification page
