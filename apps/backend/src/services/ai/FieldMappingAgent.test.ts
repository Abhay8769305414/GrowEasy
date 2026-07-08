import { describe, it, expect, vi } from 'vitest';
import { suggestFieldMappings, runDeterministicFieldMappingFallback } from './FieldMappingAgent';


vi.mock('./GeminiClient', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    isGeminiActive: vi.fn(() => false), // Prediction mock
  };
});

describe('Field Mapping Agent & Fallback', () => {
  const sampleRows = [
    {
      'First Name': 'Rahul',
      'Last Name': 'Sharma',
      'Email Address': 'rahul.sharma@techcorp.in',
      'Phone Number': '+91 98765 43210',
      'Company Name': 'TechCorp India',
    },
  ];

  describe('runDeterministicFieldMappingFallback', () => {
    it('should map exact field name matches', () => {
      const result = runDeterministicFieldMappingFallback(['name', 'email'], sampleRows);
      
      const nameMapping = result.mappings.find(m => m.csvColumn === 'name');
      const emailMapping = result.mappings.find(m => m.csvColumn === 'email');
      
      expect(nameMapping?.crmField).toBe('name');
      expect(nameMapping?.confidence).toBe(0.95);
      
      expect(emailMapping?.crmField).toBe('email');
      expect(emailMapping?.confidence).toBe(0.95);
    });

    it('should map common field aliases case-insensitively', () => {
      const result = runDeterministicFieldMappingFallback(
        ['First Name', 'Email Address', 'Phone Number', 'Company Name'],
        sampleRows
      );

      const firstNameMapping = result.mappings.find(m => m.csvColumn === 'First Name');
      const emailMapping = result.mappings.find(m => m.csvColumn === 'Email Address');
      const phoneMapping = result.mappings.find(m => m.csvColumn === 'Phone Number');
      const companyMapping = result.mappings.find(m => m.csvColumn === 'Company Name');

      expect(firstNameMapping?.crmField).toBe('name');
      expect(emailMapping?.crmField).toBe('email');
      expect(phoneMapping?.crmField).toBe('phone');
      expect(companyMapping?.crmField).toBe('company');
      
      expect(firstNameMapping?.confidence).toBe(0.95);
    });

    it('should map unknown headers to null', () => {
      const result = runDeterministicFieldMappingFallback(['random_unrelated_column'], sampleRows);
      
      const mapping = result.mappings[0];
      expect(mapping.crmField).toBeNull();
      expect(mapping.confidence).toBe(0.0);
      expect(result.unmappedColumns).toContain('random_unrelated_column');
    });
  });

  describe('suggestFieldMappings', () => {
    it('should fall back to deterministic match when Gemini is inactive', async () => {
      const result = await suggestFieldMappings(
        ['First Name', 'Email Address', 'random_col'],
        sampleRows
      );

      expect(result.metadata.modelVersion).toBe('deterministic-fallback');
      expect(result.mappings).toHaveLength(3);
      
      const emailMapping = result.mappings.find(m => m.csvColumn === 'Email Address');
      expect(emailMapping?.crmField).toBe('email');
      expect(emailMapping?.confidence).toBe(0.95);

      const unmapped = result.mappings.find(m => m.csvColumn === 'random_col');
      expect(unmapped?.crmField).toBeNull();
    });
  });
});
