import PDFDocument from 'pdfkit';

const NAVY = '#0B1F44';
const GOLD = '#B08D3C';
const INK = '#1F2937';
const MUTED = '#6B7280';

export interface CertificatePdfInput {
  certificateId: string;
  recipientName: string;
  certificateTitle: string;
  courseName: string;
  issuingOrganization: string;
  issueDate: string; // YYYY-MM-DD
  description?: string | null;
  verificationUrl: string;
  qrPng: Buffer;
}

export function formatIssueDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

type Doc = InstanceType<typeof PDFDocument>;

/** Largest font size (<= max) at which `text` fits in `maxWidth`. */
function fitFontSize(doc: Doc, text: string, font: string, max: number, min: number, maxWidth: number, spacing = 0) {
  doc.font(font);
  let size = max;
  while (size > min) {
    doc.fontSize(size);
    if (doc.widthOfString(text, { characterSpacing: spacing }) <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function centered(doc: Doc, text: string, y: number, opts: { font: string; size: number; color: string; spacing?: number }) {
  const { width } = doc.page;
  doc
    .font(opts.font)
    .fontSize(opts.size)
    .fillColor(opts.color)
    .text(text, 0, y, { width, align: 'center', characterSpacing: opts.spacing ?? 0, lineBreak: false });
}

function cornerOrnament(doc: Doc, x: number, y: number, dx: number, dy: number) {
  const len = 34;
  doc
    .save()
    .lineWidth(1.6)
    .strokeColor(GOLD)
    .moveTo(x, y + dy * len)
    .lineTo(x, y)
    .lineTo(x + dx * len, y)
    .stroke()
    .circle(x + dx * 7, y + dy * 7, 2)
    .fill(GOLD)
    .restore();
}

/**
 * Renders a landscape A4 certificate with an embedded verification QR code.
 * Returns the finished PDF as a Buffer (hashed and uploaded to S3 by the caller).
 */
export function generateCertificatePdf(input: CertificatePdfInput): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: 0,
      info: {
        Title: `${input.certificateTitle} — ${input.recipientName}`,
        Author: input.issuingOrganization,
        Subject: input.courseName,
        Keywords: `certivault,certificate,${input.certificateId}`,
        Creator: 'CertiVault',
        Producer: 'CertiVault (PDFKit)',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width;
    const H = doc.page.height;

    // ── Background & frame ───────────────────────────────────────────
    doc.rect(0, 0, W, H).fill('#FFFFFF');
    doc.rect(0, 0, W, 6).fill(NAVY);
    doc.rect(0, H - 6, W, 6).fill(NAVY);
    doc.rect(20, 20, W - 40, H - 40).lineWidth(2.2).stroke(NAVY);
    doc.rect(28, 28, W - 56, H - 56).lineWidth(0.6).stroke(GOLD);
    cornerOrnament(doc, 38, 38, 1, 1);
    cornerOrnament(doc, W - 38, 38, -1, 1);
    cornerOrnament(doc, 38, H - 38, 1, -1);
    cornerOrnament(doc, W - 38, H - 38, -1, -1);

    // ── Header ───────────────────────────────────────────────────────
    const org = input.issuingOrganization.toUpperCase();
    const orgSize = fitFontSize(doc, org, 'Helvetica-Bold', 11, 7, W - 200, 3);
    centered(doc, org, 62, { font: 'Helvetica-Bold', size: orgSize, color: GOLD, spacing: 3 });
    doc.moveTo(W / 2 - 36, 84).lineTo(W / 2 + 36, 84).lineWidth(0.8).stroke(GOLD);

    const title = input.certificateTitle.toUpperCase();
    const titleSize = fitFontSize(doc, title, 'Times-Bold', 32, 18, W - 180, 2.5);
    centered(doc, title, 102, { font: 'Times-Bold', size: titleSize, color: NAVY, spacing: 2.5 });

    // ── Recipient ────────────────────────────────────────────────────
    centered(doc, 'This is to certify that', 158, { font: 'Helvetica-Oblique', size: 12, color: MUTED });

    const nameSize = fitFontSize(doc, input.recipientName, 'Times-BoldItalic', 44, 22, W - 220);
    centered(doc, input.recipientName, 182 + (44 - nameSize) / 2, {
      font: 'Times-BoldItalic',
      size: nameSize,
      color: NAVY,
    });
    doc.moveTo(W / 2 - 190, 238).lineTo(W / 2 + 190, 238).lineWidth(0.8).stroke(GOLD);

    centered(doc, 'has successfully completed', 254, { font: 'Helvetica', size: 12, color: MUTED });
    const courseSize = fitFontSize(doc, input.courseName, 'Helvetica-Bold', 19, 11, W - 200);
    centered(doc, input.courseName, 276, { font: 'Helvetica-Bold', size: courseSize, color: INK });

    if (input.description) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor(MUTED)
        .text(input.description, W / 2 - 260, 310, {
          width: 520,
          align: 'center',
          height: 42,
          ellipsis: true,
          lineGap: 2,
        });
    }

    // ── Footer row: date & ID | signature | QR ───────────────────────
    const rowY = 410;
    const leftX = 78;
    const label = (text: string, x: number, y: number) =>
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(MUTED).text(text, x, y, { characterSpacing: 1.4, lineBreak: false });

    label('DATE OF ISSUE', leftX, rowY + 8);
    doc.font('Helvetica').fontSize(13).fillColor(INK).text(formatIssueDate(input.issueDate), leftX, rowY + 22, { lineBreak: false });
    label('CERTIFICATE ID', leftX, rowY + 50);
    doc.font('Courier').fontSize(8.5).fillColor(NAVY).text(input.certificateId, leftX, rowY + 64, { lineBreak: false });

    // Seal
    const sealX = W / 2;
    const sealY = rowY + 22;
    doc.circle(sealX, sealY, 26).lineWidth(1.4).stroke(GOLD);
    doc.circle(sealX, sealY, 21).lineWidth(0.5).stroke(GOLD);
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor(GOLD)
      .text('VERIFIED', sealX - 26, sealY - 8, { width: 52, align: 'center', characterSpacing: 1, lineBreak: false })
      .text('CREDENTIAL', sealX - 26, sealY + 1, { width: 52, align: 'center', characterSpacing: 0.6, lineBreak: false });

    doc.moveTo(sealX - 110, rowY + 74).lineTo(sealX + 110, rowY + 74).lineWidth(0.7).stroke(INK);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(INK)
      .text('Authorized Signatory', sealX - 110, rowY + 80, { width: 220, align: 'center', lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(MUTED)
      .text(input.issuingOrganization, sealX - 140, rowY + 93, { width: 280, align: 'center', lineBreak: false, ellipsis: true });

    const qrSize = 92;
    const qrX = W - 78 - qrSize;
    doc.image(input.qrPng, qrX, rowY - 6, { width: qrSize, height: qrSize });
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(NAVY)
      .text('SCAN TO VERIFY', qrX - 10, rowY + qrSize + 2, { width: qrSize + 20, align: 'center', characterSpacing: 1, lineBreak: false });

    // ── Verification footer ──────────────────────────────────────────
    centered(doc, `Verify the authenticity of this certificate at ${input.verificationUrl}`, H - 52, {
      font: 'Helvetica',
      size: 7.5,
      color: MUTED,
    });

    doc.end();
  });
}
