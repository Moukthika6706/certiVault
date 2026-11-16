import multer from 'multer';
import { config } from '../config/env';
import { AppError } from '../utils/errors';

/**
 * PDFs are held in memory (max MAX_UPLOAD_MB) just long enough to hash them and
 * send them to S3 — they are never written to the EC2 disk.
 */
export const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1, fields: 20 },
  fileFilter: (_req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' && file.originalname.toLowerCase().endsWith('.pdf');
    if (!isPdf) return cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF files (.pdf) are accepted'));
    cb(null, true);
  },
});
