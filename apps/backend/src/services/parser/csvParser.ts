import { parse } from 'fast-csv';
import { Readable, Transform, TransformCallback } from 'stream';
import { logger } from '../logger';
import { config } from '../../config';

export class CsvLineFilter extends Transform {
  private buffer = '';
  public skippedRows = 0;
  private isFirstLine = true;

  constructor() {
    super({ objectMode: false });
  }

  _transform(chunk: unknown, _encoding: BufferEncoding, callback: TransformCallback) {
    const data = this.buffer + Buffer.from(chunk as Buffer).toString('utf-8');
    const lines = data.split(/\r?\n/);

    this.buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (this.isFirstLine) {
        if (line.trim() === '') {
          this.skippedRows++;
        } else {
          this.push(line + '\r\n');
          this.isFirstLine = false;
        }
        continue;
      }

      const trimmed = line.trim();
      const sanitized = trimmed.replace(/[,;\t|]/g, '').trim();

      if (sanitized === '') {
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

        if (sanitized === '') {
          this.skippedRows++;
        } else {
          this.push(lastLine + '\r\n');
        }
      }
    }

    callback();
  }
}

export interface ParsedCsv {
  headers: string[];
  preview: Record<string, string>[];
  rows: Record<string, string>[];
  totalRows: number;
  skippedRows: number;
  delimiter: string;
  encoding: string;
}

export interface ParseOptions {
  previewLimit?: number;
  fileBuffer: Buffer;
  originalName: string;
  jobId: string;
}

export function detectDelimiter(firstLine: string): string {
  const candidates: Array<{ char: string; count: number }> = [
    { char: ',', count: (firstLine.match(/,/g) ?? []).length },
    { char: ';', count: (firstLine.match(/;/g) ?? []).length },
    { char: '\t', count: (firstLine.match(/\t/g) ?? []).length },
    { char: '|', count: (firstLine.match(/\|/g) ?? []).length },
  ];

  const winner = candidates.reduce((a, b) => (a.count >= b.count ? a : b));
  return winner.count > 0 ? winner.char : ',';
}

function readFirstLineFromBuffer(fileBuffer: Buffer): string {
  const content = fileBuffer.subarray(0, 4096).toString('utf-8');
  const stripped = content.startsWith('\uFEFF') ? content.slice(1) : content;
  return stripped.split('\n')[0] ?? '';
}

function stripBom(value: string): string {
  return value.startsWith('\uFEFF') ? value.slice(1) : value;
}

function cleanHeader(key: string): string {
  return stripBom(key).trim().replace(/\s+/g, ' ');
}

function createUploadStream(fileBuffer: Buffer): Readable {
  return Readable.from([fileBuffer]);
}

export async function parseCsvBuffer(options: ParseOptions): Promise<ParsedCsv> {
  const { fileBuffer, originalName, jobId, previewLimit = config.previewRowLimit } = options;
  const log = logger.child({ jobId, requestId: jobId, file: originalName });

  log.info({ sizeBytes: fileBuffer.byteLength }, '[CSV Parser] Stage 1: Upload buffer received');

  if (fileBuffer.byteLength === 0) {
    throw new Error('Uploaded file is empty');
  }

  const firstLine = readFirstLineFromBuffer(fileBuffer);
  const delimiter = detectDelimiter(firstLine);
  log.info({ delimiter, firstLine: firstLine.slice(0, 120) }, '[CSV Parser] Stage 2: Delimiter detected');

  return new Promise<ParsedCsv>((resolve, reject) => {
    const preview: Record<string, string>[] = [];
    const rows: Record<string, string>[] = [];
    let headers: string[] = [];
    let totalRows = 0;
    let headersLogged = false;

    const fileStream = createUploadStream(fileBuffer);
    const filter = new CsvLineFilter();
    const parser = parse({
      headers: (rawHeaders) => {
        const cleaned = rawHeaders.map((h) => cleanHeader(h ?? ''));
        headers = cleaned;

        log.info({ headers, count: headers.length }, '[CSV Parser] Stage 3: Headers detected');
        return cleaned;
      },
      ignoreEmpty: false,
      trim: true,
      delimiter,
      encoding: 'utf8',
    });

    fileStream.on('error', (err) => {
      log.error({ err: err.message }, '[CSV Parser] Upload buffer stream error');
      reject(new Error(`Buffer stream error: ${err.message}`));
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

      if (!headersLogged) {
        log.info({ firstDataRow: totalRows }, '[CSV Parser] Stage 4: First data row parsed');
        headersLogged = true;
      }

      rows.push(row);

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
        `[CSV Parser] Stage 5: Parsing complete - ${totalRows} valid rows, ${skippedRows} skipped`
      );

      resolve({
        headers,
        preview,
        rows,
        totalRows,
        skippedRows,
        delimiter,
        encoding: 'utf-8',
      });
    });

    fileStream.pipe(filter).pipe(parser);
  });
}

export async function readAllCsvRowsFromBuffer(
  fileBuffer: Buffer,
  delimiter: string
): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const rows: Record<string, string>[] = [];
    const fileStream = createUploadStream(fileBuffer);
    const filter = new CsvLineFilter();
    const parser = parse({
      headers: (rawHeaders) => rawHeaders.map((h) => cleanHeader(h ?? '')),
      ignoreEmpty: false,
      trim: true,
      delimiter,
      encoding: 'utf8',
    });

    fileStream.on('error', (err) => reject(new Error(`Buffer stream error: ${err.message}`)));
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
