import { describe, it, expect } from 'vitest';
import { validateCrmRecord } from './validator';

describe('Deterministic Backend Validator', () => {
  const rawData = { 'First Name': 'Rahul', Email: 'rahul@example.com' };

  it('should mark a valid record as success', () => {
    const record = {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@techcorp.in',
      phone: '+919876543210',
    };

    const result = validateCrmRecord(record, 0, rawData);
    expect(result.status).toBe('success');
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('should skip rows that have neither email nor phone', () => {
    const record = {
      name: 'Rahul Sharma',
    };

    const result = validateCrmRecord(record, 0, rawData);
    expect(result.status).toBe('skipped');
    expect(result.errors).toHaveLength(0);
  });

  it('should fail rows that are missing a required field (name)', () => {
    const record = {
      email: 'rahul.sharma@techcorp.in',
      phone: '+919876543210',
    };

    const result = validateCrmRecord(record, 0, rawData);
    expect(result.status).toBe('failed');
    expect(result.errors.find(e => e.field === 'name')).toBeDefined();
  });

  it('should fail rows with invalid email formats', () => {
    const record = {
      name: 'Rahul Sharma',
      email: 'invalid-email',
      phone: '+919876543210',
    };

    const result = validateCrmRecord(record, 0, rawData);
    expect(result.status).toBe('failed');
    expect(result.errors.find(e => e.field === 'email')).toBeDefined();
  });

  it('should generate warnings but succeed for invalid optional enums (status)', () => {
    const record = {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@techcorp.in',
      status: 'InvalidStatusOption',
    };

    const result = validateCrmRecord(record, 0, rawData);
    expect(result.status).toBe('success'); // warning, not fatal
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.find(w => w.field === 'status')).toBeDefined();
  });

  it('should generate warnings but succeed for invalid optional dates', () => {
    const record = {
      name: 'Rahul Sharma',
      email: 'rahul.sharma@techcorp.in',
      created_at: 'not-a-date-format',
    };

    const result = validateCrmRecord(record, 0, rawData);
    expect(result.status).toBe('success'); // warning, not fatal
    expect(result.errors).toHaveLength(0);
    expect(result.warnings.find(w => w.field === 'created_at')).toBeDefined();
  });
});
