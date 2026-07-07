import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  normalizePhone,
  normalizeCountry,
  normalizeName,
  normalizeDate,
  normalizeCrmRecord,
} from './normalizer';

describe('Deterministic Backend Normalizer', () => {
  describe('normalizeEmail', () => {
    it('should lowercase and trim email addresses', () => {
      expect(normalizeEmail('  RAHUL.sharma@TechCorp.in  ')).toBe('rahul.sharma@techcorp.in');
    });
  });

  describe('normalizePhone', () => {
    it('should strip non-digit characters except leading plus', () => {
      expect(normalizePhone('+91 98765-43210')).toBe('+919876543210');
    });

    it('should prepend +91 for 10-digit Indian numbers', () => {
      expect(normalizePhone('9876512345')).toBe('+919876512345');
    });

    it('should prepend plus for numbers starting with country prefix', () => {
      expect(normalizePhone('919876543210')).toBe('+919876543210');
      expect(normalizePhone('15551234567')).toBe('+15551234567');
    });
  });

  describe('normalizeCountry', () => {
    it('should resolve common names to ISO codes', () => {
      expect(normalizeCountry('India')).toBe('IN');
      expect(normalizeCountry('  United States  ')).toBe('US');
      expect(normalizeCountry('usa')).toBe('US');
      expect(normalizeCountry('uk')).toBe('GB');
      expect(normalizeCountry('Spain')).toBe('ES');
      expect(normalizeCountry('France')).toBe('FR');
      expect(normalizeCountry('UAE')).toBe('AE');
      expect(normalizeCountry('New Zealand')).toBe('NZ');
    });

    it('should fallback to raw trimmed name for truly unknown countries', () => {
      expect(normalizeCountry('Westeros')).toBe('Westeros');
    });
  });

  describe('normalizeName', () => {
    it('should trim and title case name strings', () => {
      expect(normalizeName('  rahul   kumar  sharma ')).toBe('Rahul Kumar Sharma');
      expect(normalizeName('Lisa MÜLLER')).toBe('Lisa Müller');
    });
  });

  describe('normalizeDate', () => {
    it('should preserve correct ISO dates', () => {
      expect(normalizeDate('2024-01-15')).toBe('2024-01-15');
    });

    it('should parse DD/MM/YYYY and DD-MM-YYYY', () => {
      expect(normalizeDate('15/01/2024')).toBe('2024-01-15');
      expect(normalizeDate('15-01-2024')).toBe('2024-01-15');
    });

    it('should parse dates with month names', () => {
      expect(normalizeDate('15-Jan-2024')).toBe('2024-01-15');
      expect(normalizeDate('15 January 2024')).toBe('2024-01-15');
      expect(normalizeDate('Jan 15, 2024')).toBe('2024-01-15');
    });

    it('should fall back to raw string for unparseable dates', () => {
      expect(normalizeDate('not-a-date')).toBe('not-a-date');
    });
  });

  describe('normalizeCrmRecord', () => {
    it('should normalize all fields in a record using the CRM_SCHEMA config', () => {
      const record = {
        name: '  rahul sharma ',
        email: ' RAHUL.SHARMA@TECHCORP.IN',
        phone: '9876543210',
        country: 'India',
        created_at: '15/01/2024',
        company: 'TechCorp', // not normalized in schema definition
      };

      const normalized = normalizeCrmRecord(record);

      expect(normalized).toEqual({
        name: 'Rahul Sharma',
        email: 'rahul.sharma@techcorp.in',
        phone: '+919876543210',
        country: 'IN',
        created_at: '2024-01-15',
        company: 'TechCorp',
      });
    });
  });
});
