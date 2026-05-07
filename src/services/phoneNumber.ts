export type SupportedPhoneCountry = 'FR' | 'RE';

export const PHONE_COUNTRIES: Array<{
  code: SupportedPhoneCountry;
  flag: string;
  label: string;
  dialCode: string;
}> = [
  { code: 'FR', flag: '🇫🇷', label: 'France', dialCode: '+33' },
  { code: 'RE', flag: '🇷🇪', label: 'Réunion', dialCode: '+262' },
];

function sanitizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function parseStoredPhone(value: string): {
  country: SupportedPhoneCountry;
  nationalNumber: string;
} {
  const raw = value.trim();
  if (raw.startsWith('+33')) {
    return {
      country: 'FR',
      nationalNumber: sanitizeDigits(raw.slice(3)),
    };
  }
  if (raw.startsWith('+262')) {
    return {
      country: 'RE',
      nationalNumber: sanitizeDigits(raw.slice(4)),
    };
  }
  return {
    country: 'RE',
    nationalNumber: sanitizeDigits(raw),
  };
}

export function normalizeNationalPhone(country: SupportedPhoneCountry, value: string): string {
  const digits = sanitizeDigits(value);
  if (digits.length === 10 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  if (country === 'FR' && digits.length === 9) return digits;
  if (country === 'RE' && digits.length === 9) return digits;
  return digits;
}

export function isValidNationalPhone(country: SupportedPhoneCountry, value: string): boolean {
  const normalized = normalizeNationalPhone(country, value);
  if (country === 'FR') {
    return /^[1-9]\d{8}$/.test(normalized);
  }
  return /^(69\d{7}|26\d{7})$/.test(normalized);
}

export function buildInternationalPhone(country: SupportedPhoneCountry, national: string): string {
  const normalized = normalizeNationalPhone(country, national);
  const dialCode = country === 'FR' ? '+33' : '+262';
  return `${dialCode} ${normalized}`;
}
