import { describe, it, expect, vi } from 'vitest';
import { extractCrmRecords, runDeterministicExtractionFallback } from './CRMExtractionAgent';
import { isGeminiActive } from './GeminiClient';

vi.mock('./GeminiClient', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    isGeminiActive: vi.fn(() => false), // Mock Gemini as inactive for test predictability
  };
});

describe('CRM Extraction Agent & Zod Parsing', () => {
  const input = {
    batchId: 'batch-001',
    rows: [
      {
        'First Name': 'Rahul',
        'Last Name': 'Sharma',
        'Email Address': 'rahul.sharma@techcorp.in',
        'Phone Number': '+91 98765 43210',
      },
    ],
    fieldMappings: [
      { csvColumn: 'First Name', crmField: 'name' as const },
      { csvColumn: 'Email Address', crmField: 'email' as const },
      { csvColumn: 'Phone Number', crmField: 'phone' as const },
    ],
  };

  describe('runDeterministicExtractionFallback', () => {
    it('should map values directly using the provided mappings', () => {
      const result = runDeterministicExtractionFallback(input);

      expect(result.metadata.modelVersion).toBe('deterministic-fallback');
      expect(result.results).toHaveLength(1);
      
      const record = result.results[0];
      expect(record.rowIndex).toBe(0);
      expect(record.skipped).toBe(false);
      expect(record.extracted).toEqual({
        name: 'Rahul',
        email: 'rahul.sharma@techcorp.in',
        phone: '+91 98765 43210',
      });
    });
  });

  describe('extractCrmRecords', () => {
    it('should fall back to deterministic extraction when Gemini is inactive', async () => {
      const result = await extractCrmRecords(input);
      
      expect(result.metadata.modelVersion).toBe('deterministic-fallback');
      expect(result.results[0].extracted).toEqual({
        name: 'Rahul',
        email: 'rahul.sharma@techcorp.in',
        phone: '+91 98765 43210',
      });
    });
  });
});
