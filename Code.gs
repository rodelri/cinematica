/**
 * Mantiene el endpoint web existente del proyecto.
 * No interfiere con las funciones de hoja de cálculo.
 */
function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle('Cinemática');
}

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
