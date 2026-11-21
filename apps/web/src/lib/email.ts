const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX_LENGTH = 254;

// Conferência do site antes de enviar; a API valida de novo.
export function isValidEmail(value: string): boolean {
  const email = value.trim();
  return EMAIL_PATTERN.test(email) && email.length <= EMAIL_MAX_LENGTH;
}
