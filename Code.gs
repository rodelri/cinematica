function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Cinemática');
}

/**
 * Genera parejas aleatorias y escribe solo los nombres en la hoja indicada.
 *
 * La hoja de entrada debe tener encabezados en la primera fila con, al menos:
 * - Nombre
 * - Correo (opcional para lectura, no se escribe en salida)
 * - ID (opcional para lectura, no se escribe en salida)
 *
 * En la hoja de salida se escriben únicamente:
 * - Pareja
 * - Alumno 1
 * - Alumno 2
 */
function generarParejasSoloNombres() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const hojaEntrada = libro.getSheetByName('Alumnos');
  const hojaSalida = libro.getSheetByName('Parejas') || libro.insertSheet('Parejas');

  if (!hojaEntrada) {
    throw new Error('No existe la hoja "Alumnos".');
  }

  const datos = hojaEntrada.getDataRange().getValues();
  if (datos.length < 2) {
    throw new Error('No hay alumnos para generar parejas.');
  }

  const encabezados = datos[0].map((valor) => String(valor).trim().toLowerCase());
  const indiceNombre = encabezados.findIndex((h) => h === 'nombre');

  if (indiceNombre === -1) {
    throw new Error('La hoja "Alumnos" debe incluir una columna "Nombre".');
  }

  const alumnos = datos
    .slice(1)
    .map((fila) => ({
      nombre: String(fila[indiceNombre] || '').trim(),
    }))
    .filter((alumno) => alumno.nombre);

  if (alumnos.length < 2) {
    throw new Error('Se requieren al menos 2 alumnos con nombre.');
  }

  barajar(alumnos);

  const salida = [['Pareja', 'Alumno 1', 'Alumno 2']];
  for (let i = 0; i < alumnos.length; i += 2) {
    const alumno1 = alumnos[i] ? alumnos[i].nombre : '';
    const alumno2 = alumnos[i + 1] ? alumnos[i + 1].nombre : '';
    salida.push([Math.floor(i / 2) + 1, alumno1, alumno2]);
  }

  hojaSalida.clearContents();
  hojaSalida.getRange(1, 1, salida.length, salida[0].length).setValues(salida);
}

/**
 * Baraja un arreglo usando Fisher-Yates (in-place).
 * @param {Array<any>} arreglo
 */
function barajar(arreglo) {
  for (let i = arreglo.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arreglo[i], arreglo[j]] = [arreglo[j], arreglo[i]];
  }
}
