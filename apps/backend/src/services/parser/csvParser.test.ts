import { describe, it, expect, beforeAll } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { parseCsvFile, detectDelimiter } from './csvParser';

// ─── Path to sample CSV ────────────────────────────────────────────────────────
const SAMPLE_CSV = path.resolve(__dirname, '../../../../../sample_contacts.csv');

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function writeTempCsv(content: string): Promise<string> {
  const tmpFile = path.join(os.tmpdir(), `test-csv-${Date.now()}.csv`);
  fs.writeFileSync(tmpFile, content, 'utf-8');
  return tmpFile;
}

// ─── detectDelimiter ──────────────────────────────────────────────────────────

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

// ─── parseCsvFile — sample_contacts.csv ──────────────────────────────────────

describe('parseCsvFile() with sample_contacts.csv', () => {
  const JOB_ID = 'test-job-001';

  beforeAll(() => {
    if (!fs.existsSync(SAMPLE_CSV)) {
      throw new Error(`sample_contacts.csv not found at: ${SAMPLE_CSV}`);
    }
  });

  it('parses the sample CSV and returns exactly 19 valid rows (1 blank row skipped)', async () => {
    const result = await parseCsvFile({
      filePath: SAMPLE_CSV,
      originalName: 'sample_contacts.csv',
      jobId: JOB_ID,
    });

    // The CSV has 20 data rows + 1 empty row = 19 valid rows
    expect(result.totalRows).toBe(19);
    expect(result.skippedRows).toBe(1);
  });

  it('detects exactly 17 headers matching the CSV', async () => {
    const result = await parseCsvFile({
      filePath: SAMPLE_CSV,
      originalName: 'sample_contacts.csv',
      jobId: JOB_ID,
    });

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
    const result = await parseCsvFile({
      filePath: SAMPLE_CSV,
      originalName: 'sample_contacts.csv',
      jobId: JOB_ID,
    });

    const firstRow = result.preview[0];
    expect(firstRow['First Name']).toBe('Rahul');
    expect(firstRow['Last Name']).toBe('Sharma');
    expect(firstRow['Email Address']).toBe('rahul.sharma@techcorp.in');
    expect(firstRow['Phone Number']).toBe('+91 98765 43210');
    expect(firstRow['Company Name']).toBe('TechCorp India Pvt Ltd');
    expect(firstRow['Country']).toBe('India');
  });

  it('preserves quoted commas in Tags and Notes fields', async () => {
    const result = await parseCsvFile({
      filePath: SAMPLE_CSV,
      originalName: 'sample_contacts.csv',
      jobId: JOB_ID,
    });

    // Row 1: Tags = "enterprise, decision-maker" (quoted comma)
    const firstRow = result.preview[0];
    expect(firstRow['Tags']).toBe('enterprise, decision-maker');

    // Row 11 (Carlos Rodriguez): "Spanish-speaking team. Send materials in ES."
    const carlosRow = result.preview.find((r) => r['First Name'] === 'Carlos');
    expect(carlosRow).toBeDefined();
  });

  it('preserves UTF-8 special characters', async () => {
    const result = await parseCsvFile({
      filePath: SAMPLE_CSV,
      originalName: 'sample_contacts.csv',
      jobId: JOB_ID,
    });

    // Lisa Müller — umlaut in last name
    const lisaRow = result.preview.find((r) => r['Last Name'] === 'Müller');
    expect(lisaRow).toBeDefined();
    expect(lisaRow?.['First Name']).toBe('Lisa');

    // O'Brien — apostrophe
    const obrienRow = result.preview.find((r) => r['Last Name'] === "O'Brien");
    expect(obrienRow).toBeDefined();

    // São Paulo should be preserved in Notes/City
    const isabelaRow = result.preview.find((r) => r['First Name'] === 'Isabela');
    expect(isabelaRow).toBeDefined();
    expect(isabelaRow?.['City']).toBe('São Paulo');
  });

  it('detects comma as delimiter', async () => {
    const result = await parseCsvFile({
      filePath: SAMPLE_CSV,
      originalName: 'sample_contacts.csv',
      jobId: JOB_ID,
    });

    expect(result.delimiter).toBe(',');
  });

  it('returns preview of at most 50 rows', async () => {
    const result = await parseCsvFile({
      filePath: SAMPLE_CSV,
      originalName: 'sample_contacts.csv',
      jobId: JOB_ID,
    });

    expect(result.preview.length).toBeLessThanOrEqual(50);
    expect(result.preview.length).toBe(Math.min(19, 50));
  });

  it('respects custom previewLimit', async () => {
    const result = await parseCsvFile({
      filePath: SAMPLE_CSV,
      originalName: 'sample_contacts.csv',
      jobId: JOB_ID,
      previewLimit: 5,
    });

    expect(result.preview).toHaveLength(5);
    expect(result.totalRows).toBe(19); // total is still full count
  });
});

// ─── parseCsvFile — edge cases ──────────────────────────────────────────────

describe('parseCsvFile() edge cases', () => {
  it('handles a CSV with only headers and no data rows', async () => {
    const tmpFile = await writeTempCsv('Name,Email,Phone\n');
    const result = await parseCsvFile({
      filePath: tmpFile,
      originalName: 'empty.csv',
      jobId: 'test-empty',
    });

    expect(result.totalRows).toBe(0);
    expect(result.headers).toEqual(['Name', 'Email', 'Phone']);
    expect(result.preview).toHaveLength(0);
    fs.unlinkSync(tmpFile);
  });

  it('handles semicolon delimiter', async () => {
    const tmpFile = await writeTempCsv(
      'Name;Email;Phone\nJohn;john@test.com;+1234567890\nJane;jane@test.com;+0987654321\n'
    );
    const result = await parseCsvFile({
      filePath: tmpFile,
      originalName: 'semicolon.csv',
      jobId: 'test-semi',
    });

    expect(result.delimiter).toBe(';');
    expect(result.totalRows).toBe(2);
    expect(result.preview[0]['Name']).toBe('John');
    fs.unlinkSync(tmpFile);
  });

  it('handles UTF-8 BOM at start of file', async () => {
    const tmpFile = path.join(os.tmpdir(), `bom-test-${Date.now()}.csv`);
    // Write BOM + CSV
    const BOM = '\uFEFF';
    fs.writeFileSync(tmpFile, BOM + 'Name,Email\nJohn,john@test.com\n', 'utf-8');

    const result = await parseCsvFile({
      filePath: tmpFile,
      originalName: 'bom.csv',
      jobId: 'test-bom',
    });

    // BOM must be stripped — first header should be 'Name', not '\uFEFFName'
    expect(result.headers[0]).toBe('Name');
    expect(result.headers[0].charCodeAt(0)).not.toBe(0xFEFF);
    expect(result.totalRows).toBe(1);
    fs.unlinkSync(tmpFile);
  });

  it('ignores multiple empty rows in the middle', async () => {
    const tmpFile = await writeTempCsv(
      'Name,Email\nJohn,john@test.com\n,,\n\n   ,   \nJane,jane@test.com\n'
    );
    const result = await parseCsvFile({
      filePath: tmpFile,
      originalName: 'empty-rows.csv',
      jobId: 'test-empty-rows',
    });

    expect(result.totalRows).toBe(2);
    expect(result.skippedRows).toBeGreaterThanOrEqual(1);
    fs.unlinkSync(tmpFile);
  });

  it('preserves quoted values containing commas', async () => {
    const tmpFile = await writeTempCsv(
      'Name,Tags,Notes\nJohn,"vip, enterprise","Met at conference, follow up"\nJane,"startup","No notes"\n'
    );
    const result = await parseCsvFile({
      filePath: tmpFile,
      originalName: 'quoted.csv',
      jobId: 'test-quoted',
    });

    expect(result.totalRows).toBe(2);
    expect(result.preview[0]['Tags']).toBe('vip, enterprise');
    expect(result.preview[0]['Notes']).toBe('Met at conference, follow up');
    fs.unlinkSync(tmpFile);
  });

  it('handles rows with missing trailing values', async () => {
    const tmpFile = await writeTempCsv(
      'Name,Email,Phone,Company\nJohn,john@test.com\nJane,jane@test.com,+1234567890\n'
    );
    const result = await parseCsvFile({
      filePath: tmpFile,
      originalName: 'missing-cols.csv',
      jobId: 'test-missing-cols',
    });

    // Both rows should be parsed — missing columns are empty strings
    expect(result.totalRows).toBe(2);
    expect(result.preview[0]['Name']).toBe('John');
    fs.unlinkSync(tmpFile);
  });

  it('throws a meaningful error for an empty file', async () => {
    const tmpFile = await writeTempCsv('');

    await expect(
      parseCsvFile({
        filePath: tmpFile,
        originalName: 'empty-file.csv',
        jobId: 'test-empty-file',
      })
    ).rejects.toThrow('Uploaded file is empty');

    fs.unlinkSync(tmpFile);
  });
});

describe('readAllCsvRows()', () => {
  it('reads all non-empty rows from a CSV file', async () => {
    const tmpFile = await writeTempCsv(
      'Name,Email,Phone\nRahul,rahul@example.com,+919876543210\n,,\nKumar,kumar@example.com,+919876543211'
    );
    const rows = await import('./csvParser').then((m) => m.readAllCsvRows(tmpFile, ','));
    expect(rows).toHaveLength(2);
    expect(rows[0]['Name']).toBe('Rahul');
    expect(rows[1]['Name']).toBe('Kumar');
    fs.unlinkSync(tmpFile);
  });
});

