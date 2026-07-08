import { Router } from 'express';
import { upload } from '../middleware/upload';
import { uploadRateLimit, importRateLimit } from '../middleware/rateLimit';
import { previewImport, startImport } from '../controllers/importController';


const router = Router();

/**
 * POST /api/import/preview
 * Upload a CSV file to get headers, preview rows, and total count.
 * Rate-limited: 10 preview requests per IP per minute.
 */
router.post('/preview', uploadRateLimit, upload.single('file'), previewImport);


/**
 * POST /api/import/start
 * Begin AI processing with confirmed field mappings.
 */
router.post('/start', importRateLimit, startImport);

export default router;

