import { FieldType } from '../types';
import { CrmFieldName } from '../constants';
export interface CrmFieldDefinition {
    name: CrmFieldName;
    label: string;
    type: FieldType;
    required: boolean;
    unique?: boolean;
    description: string;
    examples: string[];
    aliases: string[];
    normalize?: boolean;
    validationRegex?: string;
}
export declare const CRM_SCHEMA: CrmFieldDefinition[];
//# sourceMappingURL=crmSchema.d.ts.map