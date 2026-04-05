var CONFIG = {
  // Deja vacío para usar el spreadsheet activo (recomendado en contenedores vinculados a Sheets).
  SPREADSHEET_ID: '',

  // Emails con acceso de profesor/admin.
  ADMIN_EMAILS: [
    'profesor@centro.edu'
  ],

  // Configuración de columnas de horas.
  HOURS: {
    START_COLUMN: 4, // D
    COUNT: 12,
    PREFIX: 'HORA_'
  },

  // Texto de fallback para horas sin contenido.
  EMPTY_SLOT_LABEL: 'Sin asignar'
};
