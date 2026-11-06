/**
 * Utilidades Oficiales de Cálculo y Aproximación de Calificaciones — Decreto 67/2018 MINEDUC
 * 
 * Regla de Aproximación Oficial:
 * - Toda calificación o promedio se expresa con 1 decimal (escala 1,0 a 7,0) o escala entera (10 a 70).
 * - Cuando la centésima (segundo decimal) sea igual o superior a 5 (>= 0.05), se aproxima a la DÉCIMA SUPERIOR.
 *   Ejemplos:
 *     (7.0 + 6.7) / 2 = 6.85  -> 6.9 (o 69)
 *     (6.0 + 6.7) / 2 = 6.35  -> 6.4 (o 64)
 *     (3.9 + 4.0) / 2 = 3.95  -> 4.0 (o 40 - Aprobado)
 *     (5.8 + 5.9) / 2 = 5.85  -> 5.9 (o 59)
 *     (6.8 + 6.8) / 2 = 6.80  -> 6.8 (o 68)
 *     6.84                    -> 6.8 (o 68)
 * 
 * NOTA CRÍTICA DE PRECISION FLOTANTE IEEE-754:
 * En JavaScript nativo, (6.85).toFixed(1) produce erróneamente "6.8" debido a la representación binaria
 * 6.8499999999999996. Para asegurar aproximación matemática estricta Half-Up, se añade un margen infinitesimal (1e-9).
 */

export const roundGrade = (val: number | null | undefined): number => {
  if (val === null || val === undefined || isNaN(val) || val <= 0) return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(num) || num <= 0) return 0;
  return Math.round((num + 1e-9) * 10) / 10;
};

export const calculateAverage = (values: (number | null | undefined)[]): number | null => {
  const valid = values
    .map(v => (typeof v === 'number' ? v : parseFloat(String(v || '').replace(',', '.'))))
    .filter(v => !isNaN(v) && v > 0);
  if (valid.length === 0) return null;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return roundGrade(sum / valid.length);
};

export const formatGrade = (
  val: number | null | undefined,
  scaleMode: 'decimal' | 'entera' = 'decimal',
  emptyPlaceholder: string = '—'
): string => {
  if (val === null || val === undefined || isNaN(val) || val <= 0) return emptyPlaceholder;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
  if (isNaN(num) || num <= 0) return emptyPlaceholder;

  // Si viene en escala 10-70 y se pide decimal, normalizar
  let normalized = num;
  if (normalized > 7.0 && normalized <= 70.0) {
    normalized = normalized / 10.0;
  }

  const rounded = roundGrade(normalized);

  if (scaleMode === 'entera') {
    return Math.round(rounded * 10).toString();
  }
  return rounded.toFixed(1).replace('.', ',');
};
