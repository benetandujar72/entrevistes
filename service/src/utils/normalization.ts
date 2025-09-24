/**
 * Normaliza un nombre para una comparación robusta.
 * Elimina espacios extra, alrededor de comas, etc.
 * @param nombre El nombre a limpiar.
 * @return El nombre normalizado.
 */
export function normalizarNombre(nombre: string): string {
  if (!nombre || typeof nombre !== 'string') {
    return '';
  }
  return nombre.replace(/\s*,\s*/g, ', ') // Asegura un solo espacio después de la coma
               .replace(/\s\s+/g, ' ') // Colapsa múltiples espacios en uno solo
               .trim(); // Elimina espacios al principio y al final
}

/**
 * Procesa las columnas de entrevistas de una fila de datos.
 * Basado en la función del script GAS.
 */
export function procesarFilaDeEntrevistas(fila: any[]): string {
  let entrevistasConcatenadas: string[] = [];
  
  // Procesar columnas de entrevistas (empezando desde la columna 6, índice 6)
  for (let j = 6; j < fila.length; j += 2) {
    const fecha = fila[j];
    const acuerdos = fila[j + 1];
    
    if (fecha && acuerdos) {
      const fechaFormateada = (fecha instanceof Date) ? fecha.toLocaleString('es-ES') : fecha;
      entrevistasConcatenadas.push(`Data: ${fechaFormateada}\nAcords: ${acuerdos}`);
    }
  }
  
  return entrevistasConcatenadas.join('\n---\n');
}