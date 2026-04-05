/**
 * Obtiene el email del usuario actual.
 */
function getCurrentUserEmail_() {
  var email = Session.getActiveUser().getEmail();
  if (!email) {
    email = Session.getEffectiveUser().getEmail();
  }
  return Utils.normalizeEmail_(email);
}

/**
 * Determina perfil del usuario autenticado.
 */
function resolveUserProfile_() {
  var email = getCurrentUserEmail_();
  var adminEmails = (CONFIG.ADMIN_EMAILS || []).map(Utils.normalizeEmail_);

  if (!email) {
    return {
      authorized: false,
      mode: 'none',
      email: '',
      message: 'No se ha podido identificar tu email. Revisa permisos de la web app.'
    };
  }

  if (adminEmails.indexOf(email) !== -1) {
    return {
      authorized: true,
      mode: 'teacher',
      email: email,
      message: 'Acceso como profesor/admin.'
    };
  }

  var groups = Data.findStudentGroupsByEmail_(email);
  if (groups.length) {
    return {
      authorized: true,
      mode: 'student',
      email: email,
      groups: groups,
      message: 'Acceso como alumno.'
    };
  }

  return {
    authorized: false,
    mode: 'none',
    email: email,
    message: 'Acceso no permitido para este usuario.'
  };
}
