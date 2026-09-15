/**
 * Normalize a Venezuelan phone number to international format (58XXXXXXXXXX).
 * Returns null if the number cannot be normalized.
 */
export function normalizeVePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");

  // 12 digits starting with 58 → already international
  if (digits.startsWith("58") && digits.length === 12) {
    return digits;
  }

  // 11 digits starting with 0 → replace leading 0 with 58
  if (digits.startsWith("0") && digits.length === 11) {
    return "58" + digits.slice(1);
  }

  // 10 digits starting with 4 → prefix 58
  if (digits.startsWith("4") && digits.length === 10) {
    return "58" + digits;
  }

  return null;
}

/**
 * Build a wa.me deep link for WhatsApp.
 */
export function buildWaLink(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
