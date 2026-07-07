import { Router } from 'express';
import { upload } from '../middleware/upload';
import { uploadRateLimit } from '../middleware/rateLimit';
import { previewImport, startImport } from '../controllers/importController';

const router = Router();

/**
 * POST /api/import/preview
 * Upload a CSV file to get headers, preview rows, and total count.
 * Rate-limited: 20 uploads per IP per 15 minutes.
 */
router.post('/preview', uploadRateLimit, upload.single('file'), previewImport);

/**
 * POST /api/import/start
 * Begin AI processing with confirmed field mappings.
 */
router.post('/start', startImport);

export default router;

