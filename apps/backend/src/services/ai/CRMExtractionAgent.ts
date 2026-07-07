import { z } from 'zod';
import { CRM_SCHEMA } from '@groweasy/shared';
import { isGeminiActive, generateStructuredJson } from './GeminiClient';
import { EXTRACTION_SYSTEM_INSTRUCTION, buildExtractionPrompt } from './PromptBuilder';
import { logger } from '../logger';

const CRM_FIELDS = CRM_SCHEMA.map((f) => f.name) as unknown as [string, ...string[]];

// ─── Schemas & Types Local to Agent ──────────────────────────────────────────

export const ExtractionAgentInputSchema = z.object({
  rows: z.array(z.record(z.string())),
  fieldMappings: z.array(
    z.object({
      csvColumn: z.string(),
      crmField: z.enum(CRM_FIELDS).nullable(),
    })
  ),
  batchId: z.string(),
});

export const ExtractionAgentRowOutputSchema = z.object({
  rowIndex: z.number(),
  extracted: z.record(z.string()).optional(),
  skipped: z.boolean(),
  skipReason: z.string().optional(),
});

export const ExtractionAgentOutputSchema = z.object({
  results: z.array(ExtractionAgentRowOutputSchema),
  metadata: z.object({
    modelVersion: z.string(),
    promptVersion: z.string(),
    tokensUsed: z.number(),
    latencyMs: z.number(),
  }),
});

export type ExtractionAgentInput = z.infer<typeof ExtractionAgentInputSchema>;
export type ExtractionAgentOutput = z.infer<typeof ExtractionAgentOutputSchema>;

// ─── Implementation ──────────────────────────────────────────────────────────

/**
 * Deterministic fallback matching mapping implementation used when Gemini is inactive or fails.
 */
export function runDeterministicExtractionFallback(
  input: ExtractionAgentInput
): ExtractionAgentOutput {
  const startTime = Date.now();
  logger.info({ batchId: input.batchId }, '[CRMExtractionAgent] Running deterministic extraction fallback.');

  const results = input.rows.map((row, index) => {
    const extracted: Record<string, string> = {};
    for (const mapping of input.fieldMappings) {
      if (mapping.crmField) {
        extracted[mapping.crmField] = row[mapping.csvColumn] ?? '';
      }
    }
    return {
      rowIndex: index,
      extracted,
      skipped: false,
    };
  });

  const duration = Date.now() - startTime;
  return {
    results,
    metadata: {
      modelVersion: 'deterministic-fallback',
      promptVersion: 'v1',
      tokensUsed: 0,
      latencyMs: duration,
    },
  };
}

/**
 * Runs the CRM Extraction Agent to extract and clean records.
 * Uses Gemini 2.5 Flash if active, falling back to deterministic extraction on failure.
 */
export async function extractCrmRecords(
  input: ExtractionAgentInput
): Promise<ExtractionAgentOutput> {
  const startTime = Date.now();
  const log = logger.child({ batchId: input.batchId, rowsCount: input.rows.length });
  log.info('[CRMExtractionAgent] Starting batch extraction...');

  if (!isGeminiActive()) {
    return runDeterministicExtractionFallback(input);
  }

  const prompt = buildExtractionPrompt(input.rows, input.fieldMappings);

  // Define response JSON schema for Gemini structured output
  const responseSchema = {
    type: 'OBJECT',
    properties: {
      results: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            rowIndex: { type: 'INTEGER' },
            extracted: {
              type: 'OBJECT',
              additionalProperties: { type: 'STRING' }
            },
            skipped: { type: 'BOOLEAN' },
            skipReason: { type: 'STRING', nullable: true }
          },
          required: ['rowIndex', 'skipped']
        }
      }
    },
    required: ['results']
  };

  try {
    const aiResponse = await generateStructuredJson<any>(
      prompt,
      EXTRACTION_SYSTEM_INSTRUCTION,
      responseSchema
    );

    const duration = Date.now() - startTime;

    if (aiResponse && aiResponse.results) {
      // MANDATORY AI Response Parsing using Zod
      const validated = ExtractionAgentOutputSchema.parse({
        results: aiResponse.results,
        metadata: {
          modelVersion: 'gemini-2.5-flash',
          promptVersion: 'v1',
          tokensUsed: 0,
          latencyMs: duration
        }
      });

      log.info({ durationMs: duration }, '[CRMExtractionAgent] Gemini batch extraction completed and validated.');
      return validated;
    }
  } catch (error) {
    log.warn({ err: (error as Error).message }, '[CRMExtractionAgent] Gemini extraction failed or response failed Zod validation. Falling back.');
  }

  return runDeterministicExtractionFallback(input);
}
