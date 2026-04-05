/**
 * Endpoint web principal.
 */
function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Citas 12 horas')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Incluye subplantillas HTML (Styles/Scripts).
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
