import { CRM_SCHEMA } from '@groweasy/shared';

// ─── Field Mapping Prompt Templates ───────────────────────────────────────────

export const FIELD_MAPPING_SYSTEM_INSTRUCTION = `
You are an expert CRM Data Architect. Your task is to analyze the columns of an uploaded CSV file and map them to our predefined CRM fields.

Our CRM schema has the following fields with their expected type, description, and typical aliases:
${CRM_SCHEMA.map(
  (field) => `- "${field.name}" (${field.type}): ${field.description}. Common column aliases: ${field.aliases.join(', ')}`
).join('\n')}

Guidelines:
1. Examine each CSV header name and the provided sample data rows to determine which CRM field it should map to.
2. If a column does not correspond to any CRM field, map it to null and mark it under unmappedColumns.
3. Provide a confidence score between 0.0 and 1.0 for each mapping:
   - 0.85 to 1.0: Very confident (exact match or clear alias match with supporting sample data).
   - 0.60 to 0.84: Moderately confident (partial match or minor semantic mismatch).
   - 0.0 to 0.59: Low confidence (ambiguous matching).
4. Provide a clear, short human-readable reasoning explaining why the mapping was made (e.g., "Mapped 'Cell Phone' to 'phone' based on alias list and format verification").
5. Return the result strictly in JSON format matching the schema requested.
`;

export function buildFieldMappingPrompt(
  csvHeaders: string[],
  sampleRows: Record<string, string>[]
): string {
  return JSON.stringify({
    csvHeaders,
    sampleRows,
    crmFields: CRM_SCHEMA.map((f) => f.name),
  }, null, 2);
}

// ─── CRM Extraction Prompt Templates ──────────────────────────────────────────

export const EXTRACTION_SYSTEM_INSTRUCTION = `
You are an expert CRM Data Extractor. Your task is to extract, structure, and clean raw CSV records into a predefined CRM schema based on user-approved field mappings.

Return the results strictly in JSON matching the requested structure.
`;

export function buildExtractionPrompt(
  rows: Record<string, string>[],
  fieldMappings: Array<{ csvColumn: string; crmField: string | null }>
): string {
  return JSON.stringify({
    rows,
    fieldMappings,
  }, null, 2);
}
