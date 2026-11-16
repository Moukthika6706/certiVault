import QRCode from 'qrcode';

const QR_OPTIONS = {
  errorCorrectionLevel: 'M' as const,
  margin: 1,
  width: 360,
  color: { dark: '#0B1F44', light: '#FFFFFF' },
};

/** PNG used inside the generated certificate PDF. */
export function generateQrPng(url: string): Promise<Buffer> {
  return QRCode.toBuffer(url, { ...QR_OPTIONS, type: 'png' });
}

/** Data URL shown in the admin UI so the QR can be displayed or saved. */
export function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, QR_OPTIONS);
}
