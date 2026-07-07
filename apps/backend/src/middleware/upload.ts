import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { config } from '../config';
import { createError } from './errorHandler';

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safe);
  },
});

/**
 * Validates that the uploaded file is a CSV by extension and MIME type.
 * Guards against file type spoofing (e.g. renaming .exe to .csv).
 */
function fileFilter(_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback): void {
  const ALLOWED_EXTENSIONS = new Set(['.csv']);
  const ALLOWED_MIME_TYPES = new Set([
    'text/csv',
    'text/plain',
    'application/csv',
    'application/vnd.ms-excel',
    'application/octet-stream', // some OS/browsers send this for .csv
  ]);

  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(mime)) {
    cb(null, true);
  } else {
    cb(createError(
      `Invalid file type. Only CSV files are accepted (received: ${mime}, ${ext})`,
      400,
      'INVALID_FILE_TYPE'
    ));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.maxFileSizeBytes, // default 50 MB
    files: 1,                          // only one file per request
    fields: 0,                         // no non-file form fields needed here
  },
});
