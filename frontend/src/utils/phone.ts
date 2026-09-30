/**
 * Utility for auto-formatting Chilean phone numbers with +56 prefix.
 */
export const formatPhone = (input: string): string => {
  if (!input) return '';
  const trimmed = input.trim();

  // Preservar la secuencia inicial mientras el usuario escribe +56
  if (trimmed === '+' || trimmed === '+5' || trimmed === '+56') {
    return '+56';
  }

  // Extraer únicamente los dígitos
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  // Si ya comienza con 56 (código de Chile)
  if (digits.startsWith('56')) {
    return '+' + digits.slice(0, 11);
  }

  // Si se ingresó número local de 8 o 9 dígitos (ej: 964671713)
  return '+56' + digits.slice(0, 9);
};
