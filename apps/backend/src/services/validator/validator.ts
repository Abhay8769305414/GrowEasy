import { 
  CrmFieldValues, 
  CRM_SCHEMA, 
  RowError, 
  RowWarning, 
  CrmRecord 
} from '@groweasy/shared';

// Email validation regex (from shared apiSchemas)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// URL validation regex
const URL_REGEX = /^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+(\/.*)?$/;

export interface ValidationResult {
  status: 'success' | 'failed' | 'skipped';
  errors: RowError[];
  warnings: RowWarning[];
  skipReason?: string;
}

/**
 * Validates a normalized CRM record based on predefined rules.
 */
export function validateCrmRecord(
  record: CrmFieldValues,
  rowIndex: number,
  rawData: Record<string, string>
): CrmRecord {
  const errors: RowError[] = [];
  const warnings: RowWarning[] = [];
  let status: 'success' | 'failed' | 'skipped' = 'success';
  // 1. Skip only rows that have neither email nor phone
  const hasEmail = record.email !== undefined && record.email !== null && record.email.trim() !== '';
  const hasPhone = record.phone !== undefined && record.phone !== null && record.phone.trim() !== '';

  if (!hasEmail && !hasPhone) {
    status = 'skipped';
    warnings.push({
      field: 'row',
      message: 'Record skipped because it has neither email nor phone',
    });
  } else {
    // 2. Validate required fields
    for (const field of CRM_SCHEMA) {
      const value = record[field.name];
      const isValueEmpty = value === undefined || value === null || String(value).trim() === '';

      if (field.required && isValueEmpty) {
        status = 'failed';
        errors.push({
          field: field.name,
          message: `${field.label} is required`,
          value: value ?? undefined,
        });
      }
    }

    // 3. Format validations (Email, URL)
    if (hasEmail && !EMAIL_REGEX.test(record.email!)) {
      status = 'failed';
      errors.push({
        field: 'email',
        message: 'Invalid email address format',
        value: record.email!,
      });
    }

    if (record.website && !URL_REGEX.test(record.website)) {
      warnings.push({
        field: 'website',
        message: 'Malformed website URL format',
        value: record.website,
      });
    }

    // 4. Validate Enum values (Status, Lead Source) - warnings only, not fatal
    for (const field of CRM_SCHEMA) {
      const value = record[field.name];
      if (value && field.type === 'enum' && field.examples) {
        const allowed = field.examples.map(ex => ex.toLowerCase());
        if (!allowed.includes(String(value).toLowerCase())) {
          warnings.push({
            field: field.name,
            message: `Invalid option for ${field.label}. Expected one of: ${field.examples.join(', ')}`,
            value: String(value),
          });
        }
      }
    }

    // 5. Date validation (warnings only, not fatal)
    if (record.created_at) {
      const isIsoDate = /^\d{4}-\d{2}-\d{2}$/.test(record.created_at);
      if (!isIsoDate) {
        warnings.push({
          field: 'created_at',
          message: 'Malformed created date. Expected format: YYYY-MM-DD',
          value: record.created_at,
        });
      }
    }
  }

  return {
    row: rowIndex + 1,
    status,
    rawData,
    data: record,
    fieldConfidence: {}, // Will be populated by mapping confidence
    errors,
    warnings,
  };
}
