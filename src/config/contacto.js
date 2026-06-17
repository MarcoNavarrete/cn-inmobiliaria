export const CN_PHONE_GENERAL = '7716707794';
export const CN_WHATSAPP_GENERAL = process.env.REACT_APP_WHATSAPP_GENERAL || '527716707794';

export function normalizePhoneForWhatsApp(phone) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (!digits) {
    return '';
  }

  if (digits.length >= 12 && digits.startsWith('52')) {
    return digits;
  }

  if (digits.length === 10) {
    return `52${digits}`;
  }

  return digits;
}

export function getWhatsAppPhone(phone) {
  return normalizePhoneForWhatsApp(phone) || normalizePhoneForWhatsApp(CN_WHATSAPP_GENERAL);
}
