/**
 * Menú principal del proyecto.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Dinámicas')
    .addItem('Generar parejas 12 horas', 'runGeneratePairings12Hours')
    .addToUi();
}

/**
 * Punto de entrada desde el menú.
 */
function runGeneratePairings12Hours() {
  try {
    var sheet = SpreadsheetApp.getActiveSheet();
    var students = SheetIO.readStudentsFromSheet_(sheet);

    if (students.length < 2) {
      throw new Error('No hay suficientes alumnos válidos (mínimo 2) en columnas A:C.');
    }

    SheetIO.prepareHourColumns_(sheet, students);

    var result = Pairings.generate12Hours_(students, 12);
    SheetIO.writePairingsToSheet_(sheet, students, result.rounds);

    var msg = 'Rondas generadas: ' + result.rounds.length + ' de 12.';
    if (result.warning) {
      msg += '\n\nAviso: ' + result.warning;
    }

    SpreadsheetApp.getUi().alert('Dinámicas “12 horas”', msg, SpreadsheetApp.getUi().ButtonSet.OK);
  } catch (err) {
    SpreadsheetApp.getUi().alert('Error al generar dinámicas', String(err && err.message ? err.message : err), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/**
 * Utilidad de depuración rápida usando la hoja activa.
 * Ejecuta la generación y deja trazas en el log.
 */
function debugGeneratePairings12Hours() {
  var sheet = SpreadsheetApp.getActiveSheet();
  var students = SheetIO.readStudentsFromSheet_(sheet);
  var result = Pairings.generate12Hours_(students, 12);
  Logger.log('Total alumnos válidos: %s', students.length);
  Logger.log('Rondas generadas: %s', result.rounds.length);
  Logger.log('Aviso: %s', result.warning || '(sin aviso)');
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
