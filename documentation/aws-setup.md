# AWS Setup Guide (AWS Management Console)

This guide creates every AWS resource CertiVault needs, in this order:

1. [Pick a region](#0-before-you-start)
2. [S3 bucket](#1-amazon-s3--certificate-storage) — private, encrypted, versioned
3. [IAM policy + role](#2-aws-iam--least-privilege-access-for-ec2) — lets EC2 use the bucket without access keys
4. [EC2 instance + security group](#3-amazon-ec2--the-application-server)
5. [Elastic IP](#4-elastic-ip--a-stable-address-for-qr-codes) — stable address for QR codes
6. [CloudWatch alarm](#5-amazon-cloudwatch--monitoring)

After this, follow [deployment.md](deployment.md) to install the app on the instance.

Every section ends with **✅ Verify** (how to know it worked) and **📸 Evidence** (screenshots for your report).

---

## 0. Before you start

### Cost check — do this first

AWS pricing and Free Tier rules change. Before creating anything:

- Open **Billing and Cost Management → Free Tier** in the console to see what your account is eligible for.
  - Accounts created **on or after 15 July 2025** are on the credit-based *Free plan* (sign-up credits usable for 6 months).
  - Older accounts have the classic 12-month Free Tier (750 hours/month of a `t2.micro`/`t3.micro`, 5 GB of S3, etc.).
- When launching EC2, only pick an instance type that shows the **Free tier eligible** label for your account.
- Public IPv4 addresses (including Elastic IPs) are billed per hour by AWS; check the *Amazon VPC pricing* page.
- **Set a budget alert:** Billing → **Budgets** → *Create budget* → *Use a template* → **Zero spend budget** → enter your email → *Create*. You'll be emailed the moment anything costs money.

### Choose one region and stay in it

Top-right of the console, click the region name and choose one close to you — this guide uses **Asia Pacific (Mumbai) `ap-south-1`**. S3 buckets, EC2 instances and CloudWatch alarms are all regional; if you switch region later your resources will seem to "disappear".

📸 **Evidence:** the console home page showing the selected region; the Zero-spend budget.

---

## 1. Amazon S3 — certificate storage

**Why:** S3 is durable object storage (designed for 99.999999999% durability). Certificate PDFs live here, not on the EC2 disk, so they survive even if the server is terminated.

### 1.1 Create the bucket

1. Search **S3** in the top search bar → open **S3**.
2. Click **Create bucket**.
3. **Bucket type:** *General purpose*.
4. **Bucket name:** `certivault-certificates-<something-unique>` e.g. `certivault-certificates-mk2026`. Names are global across all AWS accounts, lowercase, no spaces. **Write it down.**
5. **Object Ownership:** *ACLs disabled (recommended)*.
6. **Block Public Access settings for this bucket:** leave **Block *all* public access** ✅ **checked** (all four boxes).
7. **Bucket Versioning:** select **Enable**.
8. **Default encryption:**
   - Encryption type: **Server-side encryption with Amazon S3 managed keys (SSE-S3)**
   - Bucket Key: leave *Enable* (irrelevant for SSE-S3).
9. Click **Create bucket**.

❌ **Avoid:** unchecking Block Public Access, adding a public-read bucket policy, or choosing SSE-KMS (it adds KMS permissions and request costs).

### 1.2 Add an HTTPS-only bucket policy (recommended)

1. Open the bucket → **Permissions** tab → **Bucket policy** → **Edit**.
2. Paste [`infrastructure/aws-policy/bucket-policy-https-only.json`](../infrastructure/aws-policy/bucket-policy-https-only.json), replacing both `REPLACE-WITH-YOUR-BUCKET-NAME`.
3. **Save changes.** This *denies* any request that isn't encrypted in transit. It grants nothing.

### 1.3 Understand the folder structure

CertiVault stores objects with keys like:

```
certificates/2026/3f6c2a91-7d4e-4b8a-9c21-5e0f8b7a6d13.pdf
```

S3 has no real folders — the whole string is the object's **key**. The console just *displays* the `/`-separated **prefixes** (`certificates/`, `2026/`) as folders. You do **not** need to create them.

### ✅ Verify

- Bucket → **Permissions**: *Block all public access* = **On**.
- Bucket → **Properties**: *Bucket Versioning* = **Enabled**, *Default encryption* = **SSE-S3**.

### 📸 Evidence

1. Bucket list showing the bucket and its region.
2. Permissions tab with Block Public Access **On** and the bucket policy.
3. Properties tab with Versioning and Default encryption.

---

## 2. AWS IAM — least-privilege access for EC2

### Concepts (for your viva)

| Term | What it is | In CertiVault |
|---|---|---|
| **IAM user** | A long-lived identity for a person or app, with a password and/or permanent access keys. | *Not used by the app.* Keys can leak; we avoid them. |
| **IAM policy** | A JSON document listing allowed/denied actions on resources. | `CertiVault-S3-Access`: `PutObject`/`GetObject` on `certificates/*`, `ListBucket` on the bucket. |
| **IAM role** | An identity with policies but **no permanent credentials**. Trusted entities "assume" it and receive temporary credentials. | `CertiVault-EC2-Role`, trusted by the EC2 service. |
| **Instance profile** | The container that attaches a role to an EC2 instance. The console creates it automatically with the role. | The app's AWS SDK reads the role's temporary, auto-rotating credentials from the instance metadata service (IMDSv2). |

### 2.1 Create the permissions policy

1. Search **IAM** → open **IAM** → left menu **Policies** → **Create policy**.
2. Choose the **JSON** tab, delete the sample, and paste [`infrastructure/aws-policy/certivault-s3-access-policy.json`](../infrastructure/aws-policy/certivault-s3-access-policy.json).
3. Replace **both** `REPLACE-WITH-YOUR-BUCKET-NAME` with your bucket name.
4. **Next** → Policy name: `CertiVault-S3-Access` → Description: *Read/write CertiVault certificate PDFs* → **Create policy**.

Why each permission exists:

| Action | Resource | Used by |
|---|---|---|
| `s3:PutObject` | `arn:aws:s3:::<bucket>/certificates/*` | Uploading a newly issued certificate |
| `s3:GetObject` | `arn:aws:s3:::<bucket>/certificates/*` | Integrity checks and presigned download URLs |
| `s3:ListBucket` | `arn:aws:s3:::<bucket>` | `HeadBucket` health check on the Cloud Infrastructure page; also makes missing keys return *404* instead of *403* |

Not granted: `DeleteObject`, `PutBucketPolicy`, access to any other bucket, or anything outside S3.

### 2.2 Create the role

1. IAM → **Roles** → **Create role**.
2. **Trusted entity type:** *AWS service*. **Use case:** **EC2** → *EC2* → **Next**.
   (This generates the trust policy in [`ec2-trust-policy.json`](../infrastructure/aws-policy/ec2-trust-policy.json).)
3. Search and tick **CertiVault-S3-Access** → **Next**.
4. **Role name:** `CertiVault-EC2-Role` → **Create role**.

❌ **Avoid:** attaching `AmazonS3FullAccess` or `AdministratorAccess`, and creating access keys for the app.

### ✅ Verify

IAM → Roles → `CertiVault-EC2-Role`:
- **Permissions** tab lists only `CertiVault-S3-Access`.
- **Trust relationships** tab shows `"Service": "ec2.amazonaws.com"`.

### 📸 Evidence

1. The policy JSON (Policies → CertiVault-S3-Access → *JSON*).
2. The role's Permissions and Trust relationships tabs.

---

## 3. Amazon EC2 — the application server

**Why:** EC2 is *Infrastructure as a Service* — you rent a virtual machine and control the OS. Nginx, the React build and the Node.js API run on it.

### 3.1 Launch the instance

1. Search **EC2** → **Instances** → **Launch instances**.
2. **Name:** `certivault-server`.
3. **Application and OS Images:** *Quick Start* → **Amazon Linux** → **Amazon Linux 2023 AMI** (64-bit **x86**). Check it says *Free tier eligible*.
4. **Instance type:** `t3.micro` (or `t2.micro`) — whichever shows **Free tier eligible** for your account. 1 GB RAM is enough; the setup script adds swap.
5. **Key pair (login):** **Create new key pair**
   - Name: `certivault-key` · Type: **RSA** · Format: **.pem** (Mac/Linux) → **Create key pair**.
   - The `.pem` file downloads **once** — keep it safe, never commit it to GitHub.
6. **Network settings** → **Edit**:
   - VPC/subnet: leave defaults. **Auto-assign public IP:** *Enable*.
   - **Firewall (security groups):** *Create security group*. Name `certivault-web-sg`, description *CertiVault web server*.
   - Inbound rules:

     | Type | Port | Source | Why |
     |---|---|---|---|
     | SSH | 22 | **My IP** | Only your current IP can log in to the server |
     | HTTP | 80 | Anywhere (0.0.0.0/0) | Public website and verification page |
     | HTTPS | 443 | Anywhere (0.0.0.0/0) | Only needed if you add a domain + TLS later |

   ❌ **Do not** add port 4000. The API listens on `127.0.0.1` and is reached only through Nginx.
7. **Configure storage:** 8 GiB gp3 (default) is enough (Free Tier covers up to 30 GB of EBS).
8. **Advanced details** (expand):
   - **IAM instance profile:** select **CertiVault-EC2-Role**.
   - **Metadata version:** *V2 only (token required)* (default on Amazon Linux 2023).
9. **Summary** → **Launch instance** → **View all instances**.

### 3.2 Wait for it to be healthy

- **Instance state** becomes **Running** (≈1 min).
- **Status check** becomes **3/3 checks passed** (≈2–3 min). Click refresh.

> Forgot the IAM role? Select the instance → **Actions → Security → Modify IAM role** → choose `CertiVault-EC2-Role` → **Update IAM role**. No reboot needed.

### 3.3 Connect from your Mac

```bash
mv ~/Downloads/certivault-key.pem ~/.ssh/
```

```bash
chmod 400 ~/.ssh/certivault-key.pem
```

```bash
ssh -i ~/.ssh/certivault-key.pem ec2-user@<PUBLIC-IPv4-ADDRESS>
```

Type `yes` the first time. You should see the Amazon Linux banner and an `[ec2-user@ip-... ~]$` prompt.

Common errors: `UNPROTECTED PRIVATE KEY FILE` → run the `chmod 400` command. `Operation timed out` → your IP changed; edit the security group's SSH rule and choose *My IP* again.

### ✅ Verify

Instance details show **Running**, **3/3 checks passed**, **IAM Role = CertiVault-EC2-Role**, and the security group with exactly the rules above.

### 📸 Evidence

1. Instances list with `certivault-server` Running and 3/3 checks passed.
2. Instance **Details** tab showing the IAM role, instance type and AMI.
3. **Security** tab showing the inbound rules.
4. Your terminal connected over SSH.

---

## 4. Elastic IP — a stable address for QR codes

**Why:** QR codes embed the site address (`PUBLIC_APP_URL`). An auto-assigned public IP changes whenever the instance is stopped and started, which would break every QR code already printed. An Elastic IP stays the same.

1. EC2 → **Network & Security → Elastic IPs** → **Allocate Elastic IP address** → **Allocate**.
2. Select it → **Actions → Associate Elastic IP address** → Resource type *Instance* → choose `certivault-server` → **Associate**.
3. Use this address everywhere from now on (SSH, `PUBLIC_APP_URL`, the browser).

💡 An Elastic IP that is **not** associated with a running instance still costs money — release it (Actions → *Release*) when the project is over.

📸 **Evidence:** the Elastic IP associated with the instance.

---

## 5. Amazon CloudWatch — monitoring

### Concepts

| Term | Meaning | In CertiVault |
|---|---|---|
| **Metric** | A time series of numbers. EC2 publishes `CPUUtilization`, `NetworkIn/Out`, `StatusCheckFailed`… every 5 min (basic monitoring, free). | CPU of `certivault-server` |
| **Log** | Text events (e.g. application output) stored in log groups. | PM2 logs on the instance (`pm2 logs`). Shipping them to CloudWatch Logs needs the CloudWatch Agent — optional extension. |
| **Alarm** | Watches one metric and changes state **OK → In alarm** when a threshold is crossed; can notify via SNS. | `CertiVault-High-CPU` |

**Memory and disk usage are *not* standard EC2 metrics** — the hypervisor can't see inside the guest OS. They require installing and configuring the **CloudWatch Agent** on the instance. This project uses only the standard metrics.

### 5.1 View the metrics

1. EC2 → select the instance → **Monitoring** tab → CPU utilization, Network, Status check graphs.
2. Or: **CloudWatch → Metrics → All metrics → EC2 → Per-Instance Metrics** → tick `CPUUtilization` for your instance ID.

### 5.2 Create the CPU alarm

1. **CloudWatch → Alarms → All alarms → Create alarm → Select metric**.
2. **EC2 → Per-Instance Metrics** → tick the row with your **instance ID** and **CPUUtilization** → **Select metric**.
3. **Statistic:** Average · **Period:** 5 minutes.
4. **Conditions:** Static · **Greater/Equal** · threshold **70** → *Additional configuration* → Datapoints to alarm **2 out of 2** → Missing data: *Treat as missing*.
5. **Next → Notification:** *In alarm* → **Create new topic** → name `certivault-alerts` → your email → **Create topic**. (Then confirm the subscription email AWS sends you.)
   Skip notifications entirely if you prefer — the alarm still works.
6. **Next** → Alarm name `CertiVault-High-CPU` → description *CPU ≥ 70% for 10 minutes on certivault-server* → **Next → Create alarm**.

The alarm shows **Insufficient data** for a few minutes, then **OK**.

### 5.3 Demonstrate the alarm (optional)

On the instance, generate CPU load for ~12 minutes (stops automatically):

```bash
for i in $(seq $(nproc)); do timeout 720 sh -c 'while :; do :; done' & done
```

Watch the CPU graph climb and the alarm move to **In alarm**, then back to **OK** afterwards. `t3.micro` is a burstable instance; short tests like this are fine.

Faster alternative for a live viva — force the state from **CloudShell** (the `>_` icon in the console header):

```bash
aws cloudwatch set-alarm-state --alarm-name CertiVault-High-CPU --state-value ALARM --state-reason "Demo"
```

### ✅ Verify / 📸 Evidence

1. EC2 Monitoring tab graphs.
2. The CloudWatch metric graph for `CPUUtilization`.
3. The alarm in **OK** state, and (if demonstrated) in **In alarm**, with its history.

---

## 6. S3 versioning demonstration (safe test object)

Do this with a harmless test file — **never** overwrite a real certificate.

1. On your Mac create a file: `echo "version 1" > versioning-demo.txt`
2. S3 → your bucket → **Create folder** `demo` → open it → **Upload** `versioning-demo.txt`.
3. Edit the file: `echo "version 2" > versioning-demo.txt` and upload it again to the same `demo/` prefix.
4. Toggle **Show versions** (above the object list). You'll see **two versions** of `demo/versioning-demo.txt`, each with its own *Version ID*; the newest is marked *Current*.
5. Click the older version ID → **Open** → it still says *version 1*.
6. Delete the object (with *Show versions* **off**) → S3 adds a **delete marker**; turn *Show versions* on and the old versions are still there. Delete the delete marker to "undelete".

This is why versioning protects certificates from accidental overwrites and deletions. CertiVault also records the `VersionId` returned by S3 for every certificate (visible on the certificate details page).

📸 **Evidence:** the object list with *Show versions* on and two version IDs.

---

## 7. Clean-up when the course is over

1. EC2 → terminate `certivault-server`; release the Elastic IP.
2. CloudWatch → delete the alarm; SNS → delete the topic.
3. S3 → *Empty* the bucket (removes all versions) → delete the bucket.
4. IAM → delete `CertiVault-EC2-Role` and `CertiVault-S3-Access`.
5. Delete the key pair (EC2 → Key Pairs) and the security group.
