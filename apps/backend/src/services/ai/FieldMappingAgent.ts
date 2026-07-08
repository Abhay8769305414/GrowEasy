import { z } from 'zod';
import { 
  CRM_SCHEMA,
  CrmFieldName
} from '@groweasy/shared';
import { isGeminiActive, generateStructuredJson } from './GeminiClient';
import { FIELD_MAPPING_SYSTEM_INSTRUCTION, buildFieldMappingPrompt } from './PromptBuilder';
import { logger } from '../logger';

// ─── Schemas & Types Local to Agent ──────────────────────────────────────────

const CRM_FIELDS = CRM_SCHEMA.map((f) => f.name) as unknown as [string, ...string[]];

export const FieldMappingAgentInputSchema = z.object({
  csvHeaders: z.array(z.string()),
  sampleRows: z.array(z.record(z.string())).max(5),
  crmFields: z.array(z.string()),
});

export const FieldMappingAgentOutputSchema = z.object({
  mappings: z.array(
    z.object({
      csvColumn: z.string(),
      crmField: z.enum(CRM_FIELDS).nullable(),
      confidence: z.number().min(0).max(1),
      reason: z.string(),
    })
  ),
  unmappedColumns: z.array(z.string()),
  metadata: z.object({
    modelVersion: z.string(),
    promptVersion: z.string(),
    tokensUsed: z.number(),
    latencyMs: z.number(),
  }),
});

export type FieldMappingAgentInput = z.infer<typeof FieldMappingAgentInputSchema>;
export type FieldMappingAgentOutput = z.infer<typeof FieldMappingAgentOutputSchema>;

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * Deterministic fallback matching algorithm based on predefined CRM field aliases.
 */
export function runDeterministicFieldMappingFallback(
  csvHeaders: string[],
  _sampleRows: Record<string, string>[]
): FieldMappingAgentOutput {
  logger.info('[FieldMappingAgent] Running deterministic alias-matching fallback.');
  const startTime = Date.now();
  const mappings: FieldMappingAgentOutput['mappings'] = [];
  const unmappedColumns: string[] = [];

  for (const header of csvHeaders) {
    const cleanHeader = header.trim().toLowerCase().replace(/[\s_\-]+/g, ' ');
    let matchedField: typeof CRM_SCHEMA[number] | null = null;

    for (const field of CRM_SCHEMA) {
      // 1. Direct match with field name
      const cleanFieldName = field.name.toLowerCase().replace(/_/g, ' ');
      if (cleanHeader === cleanFieldName) {
        matchedField = field;
        break;
      }
      
      // 2. Direct match with field label
      const cleanFieldLabel = field.label.toLowerCase().replace(/_/g, ' ');
      if (cleanHeader === cleanFieldLabel) {
        matchedField = field;
        break;
      }

      // 3. Match against aliases
      const hasAliasMatch = field.aliases.some(
        (alias) => cleanHeader === alias.trim().toLowerCase().replace(/[\s_\-]+/g, ' ')
      );
      if (hasAliasMatch) {
        matchedField = field;
        break;
      }
    }

    if (matchedField) {
      mappings.push({
        csvColumn: header,
        crmField: matchedField.name as CrmFieldName,
        confidence: 0.95,
        reason: `[Fallback] Auto-matched column alias matches CRM field '${matchedField.label}'.`
      });
    } else {
      mappings.push({
        csvColumn: header,
        crmField: null,
        confidence: 0.0,
        reason: '[Fallback] No matching CRM field found for this column.'
      });
      unmappedColumns.push(header);
    }
  }

  const duration = Date.now() - startTime;
  return {
    mappings,
    unmappedColumns,
    metadata: {
      modelVersion: 'deterministic-fallback',
      promptVersion: 'v1',
      tokensUsed: 0,
      latencyMs: duration
    }
  };
}

/**
 * Runs the Field Mapping Agent E2E.
 * Attempts to use Gemini 2.5 Flash, falling back to deterministic matching if needed.
 */
export async function suggestFieldMappings(
  csvHeaders: string[],
  sampleRows: Record<string, string>[]
): Promise<FieldMappingAgentOutput> {
  const log = logger.child({ csvHeadersCount: csvHeaders.length, sampleRowsCount: sampleRows.length });
  log.info('[FieldMappingAgent] Suggesting field mappings...');

  if (!isGeminiActive()) {
    return runDeterministicFieldMappingFallback(csvHeaders, sampleRows);
  }

  const prompt = buildFieldMappingPrompt(csvHeaders, sampleRows);
  
  // Define response JSON schema for Gemini structured output
  const responseSchema = {
    type: 'OBJECT',
    properties: {
      mappings: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            csvColumn: { type: 'STRING' },
            crmField: { type: 'STRING', nullable: true },
            confidence: { type: 'NUMBER' },
            reason: { type: 'STRING' }
          },
          required: ['csvColumn', 'confidence', 'reason']
        }
      },
      unmappedColumns: {
        type: 'ARRAY',
        items: { type: 'STRING' }
      }
    },
    required: ['mappings', 'unmappedColumns']
  };

  const startTime = Date.now();
  const aiResponse = await generateStructuredJson<any>(
    prompt,
    FIELD_MAPPING_SYSTEM_INSTRUCTION,
    responseSchema
  );

  const duration = Date.now() - startTime;

  if (aiResponse && aiResponse.mappings) {
    log.info({ durationMs: duration }, '[FieldMappingAgent] Gemini mapping suggestion completed successfully.');
    
    // Ensure structure is aligned to output schema
    return {
      mappings: aiResponse.mappings.map((m: any) => ({
        csvColumn: m.csvColumn,
        crmField: m.crmField as CrmFieldName | null,
        confidence: Number(m.confidence),
        reason: m.reason
      })),
      unmappedColumns: aiResponse.unmappedColumns || [],
      metadata: {
        modelVersion: 'gemini-2.5-flash',
        promptVersion: 'v1',
        tokensUsed: 0,
        latencyMs: duration
      }
    };
  }

  log.warn('[FieldMappingAgent] Gemini call failed or returned invalid format. Falling back to deterministic matching.');
  return runDeterministicFieldMappingFallback(csvHeaders, sampleRows);
}
