import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import { parseCsvBuffer, detectDelimiter, readAllCsvRowsFromBuffer } from './csvParser';

const SAMPLE_CSV = path.resolve(__dirname, '../../../../../sample_contacts.csv');
let sampleBuffer: Buffer;

function csvBuffer(content: string): Buffer {
  return Buffer.from(content, 'utf-8');
}

function parseCsv(content: string, jobId = 'test-job') {
  return parseCsvBuffer({
    fileBuffer: csvBuffer(content),
    originalName: 'test.csv',
    jobId,
  });
}

describe('detectDelimiter()', () => {
  it('detects comma', () => {
    expect(detectDelimiter('First Name,Last Name,Email')).toBe(',');
  });

  it('detects semicolon', () => {
    expect(detectDelimiter('First Name;Last Name;Email')).toBe(';');
  });

  it('detects tab', () => {
    expect(detectDelimiter('First Name\tLast Name\tEmail')).toBe('\t');
  });

  it('detects pipe', () => {
    expect(detectDelimiter('First Name|Last Name|Email')).toBe('|');
  });

  it('falls back to comma when ambiguous', () => {
    expect(detectDelimiter('John Doe')).toBe(',');
  });
});

describe('parseCsvBuffer() with sample_contacts.csv', () => {
  const JOB_ID = 'test-job-001';

  beforeAll(() => {
    if (!fs.existsSync(SAMPLE_CSV)) {
      throw new Error(`sample_contacts.csv not found at: ${SAMPLE_CSV}`);
    }
    sampleBuffer = fs.readFileSync(SAMPLE_CSV);
  });

  function parseSample(previewLimit?: number) {
    return parseCsvBuffer({
      fileBuffer: sampleBuffer,
      originalName: 'sample_contacts.csv',
      jobId: JOB_ID,
      previewLimit,
    });
  }

  it('parses the sample CSV and returns exactly 19 valid rows (1 blank row skipped)', async () => {
    const result = await parseSample();

    expect(result.totalRows).toBe(19);
    expect(result.skippedRows).toBe(1);
  });

  it('detects exactly 17 headers matching the CSV', async () => {
    const result = await parseSample();

    const expectedHeaders = [
      'First Name', 'Last Name', 'Email Address', 'Phone Number',
      'Company Name', 'Job Title', 'Address', 'City', 'State',
      'Country', 'Website', 'Lead Source', 'Status', 'Tags',
      'Notes', 'Owner', 'Created Date',
    ];

    expect(result.headers).toEqual(expectedHeaders);
    expect(result.headers).toHaveLength(17);
  });

  it('first row matches Rahul Sharma record exactly', async () => {
    const result = await parseSample();

    const firstRow = result.preview[0];
    expect(firstRow['First Name']).toBe('Rahul');
    expect(firstRow['Last Name']).toBe('Sharma');
    expect(firstRow['Email Address']).toBe('rahul.sharma@techcorp.in');
    expect(firstRow['Phone Number']).toBe('+91 98765 43210');
    expect(firstRow['Company Name']).toBe('TechCorp India Pvt Ltd');
    expect(firstRow['Country']).toBe('India');
  });

  it('preserves quoted commas in Tags and Notes fields', async () => {
    const result = await parseSample();

    const firstRow = result.preview[0];
    expect(firstRow['Tags']).toBe('enterprise, decision-maker');

    const carlosRow = result.preview.find((r) => r['First Name'] === 'Carlos');
    expect(carlosRow).toBeDefined();
  });

  it('preserves UTF-8 special characters', async () => {
    const result = await parseSample();

    const lisaRow = result.preview.find((r) => r['Last Name'] === 'M\u00fcller');
    expect(lisaRow).toBeDefined();
    expect(lisaRow?.['First Name']).toBe('Lisa');

    const obrienRow = result.preview.find((r) => r['Last Name'] === "O'Brien");
    expect(obrienRow).toBeDefined();

    const isabelaRow = result.preview.find((r) => r['First Name'] === 'Isabela');
    expect(isabelaRow).toBeDefined();
    expect(isabelaRow?.['City']).toBe('S\u00e3o Paulo');
  });

  it('detects comma as delimiter', async () => {
    const result = await parseSample();
    expect(result.delimiter).toBe(',');
  });

  it('returns preview of at most 50 rows', async () => {
    const result = await parseSample();

    expect(result.preview.length).toBeLessThanOrEqual(50);
    expect(result.preview.length).toBe(Math.min(19, 50));
  });

  it('respects custom previewLimit', async () => {
    const result = await parseSample(5);

    expect(result.preview).toHaveLength(5);
    expect(result.totalRows).toBe(19);
  });
});

describe('parseCsvBuffer() edge cases', () => {
  it('handles a CSV with only headers and no data rows', async () => {
    const result = await parseCsv('Name,Email,Phone\n', 'test-empty');

    expect(result.totalRows).toBe(0);
    expect(result.headers).toEqual(['Name', 'Email', 'Phone']);
    expect(result.preview).toHaveLength(0);
  });

  it('handles semicolon delimiter', async () => {
    const result = await parseCsv(
      'Name;Email;Phone\nJohn;john@test.com;+1234567890\nJane;jane@test.com;+0987654321\n',
      'test-semi'
    );

    expect(result.delimiter).toBe(';');
    expect(result.totalRows).toBe(2);
    expect(result.preview[0]['Name']).toBe('John');
  });

  it('handles UTF-8 BOM at start of file', async () => {
    const result = await parseCsv('\uFEFFName,Email\nJohn,john@test.com\n', 'test-bom');

    expect(result.headers[0]).toBe('Name');
    expect(result.headers[0].charCodeAt(0)).not.toBe(0xFEFF);
    expect(result.totalRows).toBe(1);
  });

  it('ignores multiple empty rows in the middle', async () => {
    const result = await parseCsv(
      'Name,Email\nJohn,john@test.com\n,,\n\n   ,   \nJane,jane@test.com\n',
      'test-empty-rows'
    );

    expect(result.totalRows).toBe(2);
    expect(result.skippedRows).toBeGreaterThanOrEqual(1);
  });

  it('preserves quoted values containing commas', async () => {
    const result = await parseCsv(
      'Name,Tags,Notes\nJohn,"vip, enterprise","Met at conference, follow up"\nJane,"startup","No notes"\n',
      'test-quoted'
    );

    expect(result.totalRows).toBe(2);
    expect(result.preview[0]['Tags']).toBe('vip, enterprise');
    expect(result.preview[0]['Notes']).toBe('Met at conference, follow up');
  });

  it('handles rows with missing trailing values', async () => {
    const result = await parseCsv(
      'Name,Email,Phone,Company\nJohn,john@test.com\nJane,jane@test.com,+1234567890\n',
      'test-missing-cols'
    );

    expect(result.totalRows).toBe(2);
    expect(result.preview[0]['Name']).toBe('John');
  });

  it('throws a meaningful error for an empty file', async () => {
    await expect(
      parseCsvBuffer({
        fileBuffer: Buffer.alloc(0),
        originalName: 'empty-file.csv',
        jobId: 'test-empty-file',
      })
    ).rejects.toThrow('Uploaded file is empty');
  });
});

describe('readAllCsvRowsFromBuffer()', () => {
  it('reads all non-empty rows from a CSV upload buffer', async () => {
    const rows = await readAllCsvRowsFromBuffer(
      csvBuffer('Name,Email,Phone\nRahul,rahul@example.com,+919876543210\n,,\nKumar,kumar@example.com,+919876543211'),
      ','
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]['Name']).toBe('Rahul');
    expect(rows[1]['Name']).toBe('Kumar');
  });
});
