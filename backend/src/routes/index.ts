import { Router } from 'express';
import * as auth from '../controllers/authController';
import * as certificates from '../controllers/certificateController';
import * as dashboard from '../controllers/dashboardController';
import * as files from '../controllers/fileController';
import * as system from '../controllers/systemController';
import * as verify from '../controllers/verifyController';
import { requireAuth } from '../middleware/auth';
import { loginLimiter, verifyLimiter } from '../middleware/rateLimit';
import { pdfUpload } from '../middleware/upload';

const router = Router();

// ── Public ─────────────────────────────────────────────────────────────
router.get('/health', system.health);
router.post('/auth/login', loginLimiter, auth.login);

router.post('/verify/file', verifyLimiter, pdfUpload.single('file'), verify.verifyFile);
router.get('/verify/:certificateId', verifyLimiter, verify.verify);
router.get('/verify/:certificateId/download-url', verifyLimiter, verify.publicDownloadUrl);
router.get('/verify/:certificateId/integrity', verifyLimiter, verify.publicIntegrity);

router.get('/files/:token', files.serveLocalFile); // local dev storage only

// ── Administrator (JWT required) ──────────────────────────────────────
router.get('/auth/me', requireAuth, auth.me);
router.get('/dashboard/stats', requireAuth, dashboard.stats);
router.get('/system', requireAuth, system.systemInfo);

router.get('/certificates', requireAuth, certificates.list);
router.post('/certificates', requireAuth, pdfUpload.single('file'), certificates.create);
router.get('/certificates/:certificateId', requireAuth, certificates.getOne);
router.get('/certificates/:certificateId/download-url', requireAuth, certificates.downloadUrl);
router.get('/certificates/:certificateId/integrity', requireAuth, certificates.integrity);
router.patch('/certificates/:certificateId/revoke', requireAuth, certificates.revoke);

export default router;
