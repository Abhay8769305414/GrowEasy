import { Router } from 'express';
import {
  getJobStatus,
  streamJobEvents,
  getJobResult,
  deleteJob,
  downloadJobJson,
  downloadJobCsv,
  validateJobIdParam,
} from '../controllers/jobController';
import { downloadRateLimit } from '../middleware/rateLimit';

const router = Router();

// Apply validateJobIdParam middleware globally for all routes matching /:id
router.param('id', validateJobIdParam);

/**
 * GET /api/jobs/:id
 * Polling endpoint — returns current job status.
 */
router.get('/:id', getJobStatus);

/**
 * GET /api/jobs/:id/events
 * SSE stream — real-time progress events.
 */
router.get('/:id/events', streamJobEvents);

/**
 * GET /api/jobs/:id/result
 * Final processed CRM records.
 */
router.get('/:id/result', getJobResult);

/**
 * GET /api/jobs/:id/download/json
 * Download clean records as JSON.
 */
router.get('/:id/download/json', downloadRateLimit, downloadJobJson);

/**
 * GET /api/jobs/:id/download/csv
 * Download clean records as CSV.
 */
router.get('/:id/download/csv', downloadRateLimit, downloadJobCsv);

/**
 * DELETE /api/jobs/:id
 * Cancel or clean up a job.
 */
router.delete('/:id', deleteJob);

export default router;
