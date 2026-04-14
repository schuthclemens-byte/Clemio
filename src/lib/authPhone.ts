const MAX_PHONE_DIGITS = 15;
const MIN_PHONE_DIGITS = 7;

export const sanitizePhoneInput = (value: string): string => {
  const hasLeadingPlus = value.trim().startsWith("+");
  const digits = value.replace(/\D/g, "").slice(0, MAX_PHONE_DIGITS);

  return hasLeadingPlus ? `+${digits}` : digits;
};

export const normalizePhone = (phone: string): string => {
  let digits = phone.replace(/[^0-9]/g, "");

  // If starts with 00 (international prefix), strip leading 00
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }
  // If starts with 0 and no country code, assume German (+49)
  else if (digits.startsWith("0")) {
    digits = `49${digits.slice(1)}`;
  }

  return digits;
};

export const isValidAuthPhone = (phone: string): boolean => {
  const normalized = normalizePhone(phone);
  return normalized.length >= MIN_PHONE_DIGITS && normalized.length <= MAX_PHONE_DIGITS;
};

export const phoneToEmail = (phone: string): string => {
  return `${normalizePhone(phone)}@phone.clemio.app`;
};
