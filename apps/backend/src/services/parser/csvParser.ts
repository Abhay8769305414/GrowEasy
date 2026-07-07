import fs from 'fs';
import path from 'path';
import { parse } from 'fast-csv';
import { Transform, TransformCallback } from 'stream';
import { logger } from '../logger';
import { config } from '../../config';

// ─── Transformer to filter empty/delimiter-only lines ───────────────────────

export class CsvLineFilter extends Transform {
  private buffer = '';
  public skippedRows = 0;
  private isFirstLine = true;

  constructor() {
    super({ objectMode: false });
  }

  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback) {
    const data = this.buffer + chunk.toString('utf-8');
    const lines = data.split(/\r?\n/);
    
    // Keep the last partial line in the buffer
    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (this.isFirstLine) {
        // Headers line is always pushed (unless entirely empty)
        if (line.trim() === '') {
          this.skippedRows++;
        } else {
          this.push(line + '\r\n');
          this.isFirstLine = false;
        }
        continue;
      }

      const trimmed = line.trim();
      // Replace candidate delimiters: comma, semicolon, tab, pipe
      const sanitized = trimmed.replace(/[,;\t|]/g, '').trim();
      const isContentEmpty = sanitized === '';

      if (isContentEmpty) {
        this.skippedRows++;
      } else {
        this.push(line + '\r\n');
      }
    }
    callback();
  }

  _flush(callback: TransformCallback) {
    const lastLine = this.buffer;
    if (lastLine) {
      if (this.isFirstLine) {
        if (lastLine.trim() === '') {
          this.skippedRows++;
        } else {
          this.push(lastLine + '\r\n');
        }
      } else {
        const trimmed = lastLine.trim();
        const sanitized = trimmed.replace(/[,;\t|]/g, '').trim();
        const isContentEmpty = sanitized === '';

        if (isContentEmpty) {
          this.skippedRows++;
        } else {
          this.push(lastLine + '\r\n');
        }
      }
    }
    callback();
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ParsedCsv {
  headers: string[];
  preview: Record<string, string>[];
  totalRows: number;
  skippedRows: number;
  delimiter: string;
  encoding: string;
}

export interface ParseOptions {
  previewLimit?: number;
  filePath: string;
  originalName: string;
  jobId: string;
}

// ─── Delimiter Detection ────────────────────────────────────────────────────────

/**
 * Peek at the first line of the file to detect the most likely delimiter.
 * Checks for comma, semicolon, tab, and pipe.
 */
export function detectDelimiter(firstLine: string): string {
  const candidates: Array<{ char: string; count: number }> = [
    { char: ',', count: (firstLine.match(/,/g) ?? []).length },
    { char: ';', count: (firstLine.match(/;/g) ?? []).length },
    { char: '\t', count: (firstLine.match(/\t/g) ?? []).length },
    { char: '|', count: (firstLine.match(/\|/g) ?? []).length },
  ];

  const winner = candidates.reduce((a, b) => (a.count >= b.count ? a : b));

  // Fall back to comma if nothing strong detected
  return winner.count > 0 ? winner.char : ',';
}

/**
 * Read the first line of a file synchronously for delimiter detection.
 */
function readFirstLine(filePath: string): string {
  const CHUNK_SIZE = 4096;
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(CHUNK_SIZE);
  const bytesRead = fs.readSync(fd, buffer, 0, CHUNK_SIZE, 0);
  fs.closeSync(fd);

  const content = buffer.slice(0, bytesRead).toString('utf-8');

  // Strip UTF-8 BOM if present
  const stripped = content.startsWith('\uFEFF') ? content.slice(1) : content;

  return stripped.split('\n')[0] ?? '';
}

// ─── BOM Strip ─────────────────────────────────────────────────────────────────

/**
 * Strip a UTF-8 BOM from a string (applied to the first header key).
 */
function stripBom(value: string): string {
  return value.startsWith('\uFEFF') ? value.slice(1) : value;
}

/**
 * Clean a header key: strip BOM, trim whitespace, normalize internal whitespace.
 */
function cleanHeader(key: string): string {
  return stripBom(key).trim().replace(/\s+/g, ' ');
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

/**
 * Parse a CSV file in streaming mode using fast-csv.
 * Never loads the entire file into memory.
 *
 * Handles:
 *   - UTF-8 + BOM
 *   - Auto-detected delimiter (comma, semicolon, tab, pipe)
 *   - Quoted values containing commas and newlines
 *   - Empty / all-whitespace rows (ignored)
 *   - Leading/trailing whitespace in values
 *
 * Returns headers, first N preview rows, and total row count.
 */
export async function parseCsvFile(options: ParseOptions): Promise<ParsedCsv> {
  const { filePath, originalName, jobId, previewLimit = config.previewRowLimit } = options;

  const requestId = jobId;
  const log = logger.child({ jobId, requestId, file: originalName });

  // ── Stage 1: File stat ────────────────────────────────────────────────────
  const stat = fs.statSync(filePath);
  log.info({ filePath, sizeBytes: stat.size }, '[CSV Parser] Stage 1: File stat');

  if (stat.size === 0) {
    throw new Error('Uploaded file is empty');
  }

  // ── Stage 2: Delimiter detection ─────────────────────────────────────────
  const firstLine = readFirstLine(filePath);
  const delimiter = detectDelimiter(firstLine);
  log.info({ delimiter, firstLine: firstLine.slice(0, 120) }, '[CSV Parser] Stage 2: Delimiter detected');

  // ── Stage 3: Parse ────────────────────────────────────────────────────────
  return new Promise<ParsedCsv>((resolve, reject) => {
    const preview: Record<string, string>[] = [];
    let headers: string[] = [];
    let totalRows = 0;
    let skippedRows = 0;
    let headersLogged = false;

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const filter = new CsvLineFilter();

    const parser = parse({
      headers: (rawHeaders) => {
        // Clean every header: strip BOM, trim whitespace
        const cleaned = rawHeaders.map((h) => cleanHeader(h ?? ''));
        headers = cleaned;

        log.info({ headers, count: headers.length }, '[CSV Parser] Stage 3: Headers detected');
        return cleaned;
      },
      ignoreEmpty: false,
      trim: true,
      delimiter,
      encoding: 'utf8',
      // fast-csv uses BOM option to handle UTF-8 BOM
    });

    fileStream.on('error', (err) => {
      log.error({ err: err.message }, '[CSV Parser] File stream error');
      reject(new Error(`File read error: ${err.message}`));
    });

    filter.on('error', (err) => {
      log.error({ err: err.message }, '[CSV Parser] Line filter error');
      reject(new Error(`Line filter error: ${err.message}`));
    });

    parser.on('error', (err) => {
      log.error({ err: err.message }, '[CSV Parser] Parse error');
      reject(new Error(`CSV parse error: ${err.message}`));
    });

    parser.on('data', (row: Record<string, string>) => {
      totalRows++;

      // Log first 3 rows in detail, then every 1000th row
      if (!headersLogged || totalRows <= 3 || totalRows % 1000 === 0) {
        log.info(
          { rowNumber: totalRows, row },
          `[CSV Parser] Stage 4: Row ${totalRows} parsed`
        );
        headersLogged = true;
      }

      // Collect preview rows
      if (preview.length < previewLimit) {
        preview.push(row);
      }
    });

    parser.on('end', (rowCount: number) => {
      const skippedRows = filter.skippedRows;
      log.info(
        {
          totalRows,
          skippedRows,
          previewRows: preview.length,
          headers,
          rawRowCount: rowCount,
        },
        `[CSV Parser] Stage 5: Parsing complete — ${totalRows} valid rows, ${skippedRows} skipped`
      );

      resolve({
        headers,
        preview,
        totalRows,
        skippedRows,
        delimiter,
        encoding: 'utf-8',
      });
    });

    fileStream.pipe(filter).pipe(parser);
  });
}

/**
 * Stream-reads all rows from a CSV file into memory for orchestrator batching.
 */
export async function readAllCsvRows(
  filePath: string,
  delimiter: string
): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' });
    const filter = new CsvLineFilter();
    const parser = parse({
      headers: (rawHeaders) => rawHeaders.map((h) => cleanHeader(h ?? '')),
      ignoreEmpty: false,
      trim: true,
      delimiter,
      encoding: 'utf8',
    });

    fileStream.on('error', (err) => reject(new Error(`File read error: ${err.message}`)));
    filter.on('error', (err) => reject(new Error(`Line filter error: ${err.message}`)));
    parser.on('error', (err) => reject(new Error(`CSV parse error: ${err.message}`)));

    parser.on('data', (row) => {
      rows.push(row);
    });

    parser.on('end', () => {
      resolve(rows);
    });

    fileStream.pipe(filter).pipe(parser);
  });
}
