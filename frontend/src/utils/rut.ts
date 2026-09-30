/**
 * Formatea automáticamente un string a formato RUT chileno con puntos y guion (ej: 12.345.678-9).
 */
export const formatRut = (value: string): string => {
  if (!value) return '';

  // Limpiar cualquier carácter que no sea dígito o K/k
  const clean = value.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length === 0) return '';
  if (clean.length === 1) return clean;

  // Separar cuerpo de dígito verificador
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);

  // Formatear cuerpo con puntos cada 3 dígitos
  const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${formattedBody}-${dv}`;
};

/**
 * Normaliza un RUT quitando puntos y guiones para búsquedas o comparaciones backend.
 */
export const cleanRut = (value: string): string => {
  if (!value) return '';
  return value.replace(/[^0-9kK]/g, '').toUpperCase();
};
