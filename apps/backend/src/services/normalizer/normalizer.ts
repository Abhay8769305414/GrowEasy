import { CrmFieldValues, CRM_SCHEMA } from '@groweasy/shared';

const COUNTRY_MAP: Record<string, string> = {
  // South Asia
  india: 'IN',
  pakistan: 'PK',
  bangladesh: 'BD',
  'sri lanka': 'LK',
  nepal: 'NP',
  // East Asia
  china: 'CN',
  japan: 'JP',
  'south korea': 'KR',
  korea: 'KR',
  taiwan: 'TW',
  // Southeast Asia
  singapore: 'SG',
  malaysia: 'MY',
  thailand: 'TH',
  vietnam: 'VN',
  indonesia: 'ID',
  philippines: 'PH',
  // Middle East
  uae: 'AE',
  'united arab emirates': 'AE',
  'saudi arabia': 'SA',
  kuwait: 'KW',
  qatar: 'QA',
  bahrain: 'BH',
  oman: 'OM',
  israel: 'IL',
  turkey: 'TR',
  // Europe
  'united kingdom': 'GB',
  uk: 'GB',
  'great britain': 'GB',
  england: 'GB',
  ireland: 'IE',
  france: 'FR',
  germany: 'DE',
  spain: 'ES',
  italy: 'IT',
  netherlands: 'NL',
  sweden: 'SE',
  norway: 'NO',
  denmark: 'DK',
  finland: 'FI',
  switzerland: 'CH',
  austria: 'AT',
  belgium: 'BE',
  portugal: 'PT',
  poland: 'PL',
  czechia: 'CZ',
  'czech republic': 'CZ',
  hungary: 'HU',
  romania: 'RO',
  greece: 'GR',
  ukraine: 'UA',
  russia: 'RU',
  // Americas
  'united states': 'US',
  usa: 'US',
  'united states of america': 'US',
  canada: 'CA',
  brazil: 'BR',
  mexico: 'MX',
  argentina: 'AR',
  chile: 'CL',
  colombia: 'CO',
  peru: 'PE',
  // Africa
  nigeria: 'NG',
  'south africa': 'ZA',
  kenya: 'KE',
  egypt: 'EG',
  ghana: 'GH',
  ethiopia: 'ET',
  // Oceania
  australia: 'AU',
  'new zealand': 'NZ',
};

const MONTHS_MAP: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  january: '01', february: '02', march: '03', april: '04', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
};

/**
 * Normalizes email format: trim and lowercase.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * Normalizes phone number format: trim invalid chars, prepend +91 for 10-digit Indian numbers,
 * and prepend + for international numbers starting with 91 or 1.
 */
export function normalizePhone(raw: string): string {
  let cleaned = raw.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    return cleaned;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  if (cleaned.length > 10 && (cleaned.startsWith('91') || cleaned.startsWith('1'))) {
    return `+${cleaned}`;
  }
  return cleaned ? `+${cleaned}` : '';
}

/**
 * Normalizes country format: lookup to ISO 3166-1 alpha-2 codes.
 */
export function normalizeCountry(raw: string): string {
  const clean = raw.trim().toLowerCase();
  return COUNTRY_MAP[clean] ?? raw.trim();
}

/**
 * Normalizes name format: trim, single spacing, title case.
 */
export function normalizeName(raw: string): string {
  const parts = raw.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return parts
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Normalizes diverse date formats (ISO, DD/MM/YYYY, DD-MM-YYYY, Month name representations) to YYYY-MM-DD.
 */
export function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  // 1. Check YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 2. Check DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const [_, day, month, year] = dmyMatch;
    const formattedMonth = month.padStart(2, '0');
    const formattedDay = day.padStart(2, '0');
    return `${year}-${formattedMonth}-${formattedDay}`;
  }

  // 3. Check Alpha-month date representations (e.g. 15-Jan-2024, 15 Jan 2024, Jan 15, 2024)
  const alphaMatch = trimmed.match(/^(\d{1,2})[\-\s]([a-zA-Z]+)[\-\s](\d{4})$/);
  if (alphaMatch) {
    const [_, day, monthStr, year] = alphaMatch;
    const monthKey = monthStr.substring(0, 3).toLowerCase();
    const month = MONTHS_MAP[monthKey];
    if (month) {
      const formattedDay = day.padStart(2, '0');
      return `${year}-${month}-${formattedDay}`;
    }
  }

  // Jan 15, 2024 style
  const monthDayYearMatch = trimmed.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (monthDayYearMatch) {
    const [_, monthStr, day, year] = monthDayYearMatch;
    const monthKey = monthStr.substring(0, 3).toLowerCase();
    const month = MONTHS_MAP[monthKey];
    if (month) {
      const formattedDay = day.padStart(2, '0');
      return `${year}-${month}-${formattedDay}`;
    }
  }

  // 4. Try native Date parsing fallback
  const timestamp = Date.parse(trimmed);
  if (!isNaN(timestamp)) {
    const dateObj = new Date(timestamp);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return trimmed;
}

/**
 * Normalizes all extracted field values of a CRM record based on predefined rules.
 */
export function normalizeCrmRecord(extracted: CrmFieldValues): CrmFieldValues {
  const normalized: CrmFieldValues = { ...extracted };

  for (const field of CRM_SCHEMA) {
    const value = normalized[field.name];
    if (value === undefined || value === null) {
      continue;
    }

    if (field.normalize) {
      if (field.name === 'email') {
        normalized.email = normalizeEmail(value);
      } else if (field.name === 'phone') {
        normalized.phone = normalizePhone(value);
      } else if (field.name === 'country') {
        normalized.country = normalizeCountry(value);
      } else if (field.name === 'name') {
        normalized.name = normalizeName(value);
      } else if (field.name === 'created_at') {
        normalized.created_at = normalizeDate(value);
      }
    }
  }

  return normalized;
}
