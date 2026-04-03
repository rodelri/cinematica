var Data = (function () {
  function openSpreadsheet_() {
    if (CONFIG.SPREADSHEET_ID) {
      return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    }
    return SpreadsheetApp.getActiveSpreadsheet();
  }

  function listValidGroups_() {
    var ss = openSpreadsheet_();
    return ss.getSheets().map(function (sheet) {
      return sheet.getName();
    });
  }

  function getStudentsByGroup_(groupName) {
    var sheet = getSheetByNameOrThrow_(groupName);
    var rows = readStudentRows_(sheet);

    return rows.map(function (row) {
      return {
        nia: row.nia,
        email: row.email,
        name: row.name
      };
    });
  }

  function getStudentClockByNia_(groupName, nia) {
    var sheet = getSheetByNameOrThrow_(groupName);
    var rows = readStudentRows_(sheet);
    var niaClean = Utils.asCleanString_(nia);

    var student = rows.filter(function (row) { return row.nia === niaClean; })[0];
    if (!student) {
      throw new Error('No se encontró el alumno con NIA ' + niaClean + ' en el grupo ' + groupName + '.');
    }

    var hours = readHoursForRow_(sheet, student.rowNumber);
    return {
      group: groupName,
      student: {
        nia: student.nia,
        email: student.email,
        name: student.name
      },
      hours: hours
    };
  }

  function getStudentClockByEmail_(groupName, email) {
    var sheet = getSheetByNameOrThrow_(groupName);
    var rows = readStudentRows_(sheet);
    var emailClean = Utils.normalizeEmail_(email);

    var student = rows.filter(function (row) {
      return Utils.normalizeEmail_(row.email) === emailClean;
    })[0];

    if (!student) {
      throw new Error('Tu email no pertenece al grupo seleccionado.');
    }

    return getStudentClockByNia_(groupName, student.nia);
  }

  function findStudentGroupsByEmail_(email) {
    var emailClean = Utils.normalizeEmail_(email);
    if (!emailClean) {
      return [];
    }

    var ss = openSpreadsheet_();
    var groups = [];

    ss.getSheets().forEach(function (sheet) {
      var rows = readStudentRows_(sheet);
      var belongs = rows.some(function (row) {
        return Utils.normalizeEmail_(row.email) === emailClean;
      });

      if (belongs) {
        groups.push(sheet.getName());
      }
    });

    return groups;
  }

  function readStudentRows_(sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return [];
    }

    var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    var output = [];

    for (var i = 0; i < values.length; i++) {
      var nia = Utils.asCleanString_(values[i][0]);
      var email = Utils.asCleanString_(values[i][1]);
      var name = Utils.asCleanString_(values[i][2]);

      if (!nia && !email && !name) {
        continue;
      }

      if (!nia || !email || !name) {
        continue;
      }

      output.push({
        rowNumber: i + 2,
        nia: nia,
        email: email,
        name: name
      });
    }

    return output;
  }

  function readHoursForRow_(sheet, rowNumber) {
    var startCol = CONFIG.HOURS.START_COLUMN;
    var count = CONFIG.HOURS.COUNT;

    var raw = sheet.getRange(rowNumber, startCol, 1, count).getDisplayValues()[0];

    return raw.map(function (cell, index) {
      return formatHourCell_(cell, index + 1);
    });
  }

  function formatHourCell_(cellValue, hourIndex) {
    var cleaned = Utils.asCleanString_(cellValue);
    if (!cleaned) {
      return {
        hour: hourIndex,
        text: CONFIG.EMPTY_SLOT_LABEL,
        type: 'empty',
        partners: []
      };
    }

    var partners = cleaned.split('|').map(function (part) {
      return Utils.asCleanString_(part);
    }).filter(function (part) {
      return !!part;
    });

    return {
      hour: hourIndex,
      text: partners.join(' | '),
      type: partners.length > 1 ? 'trio' : 'pair',
      partners: partners
    };
  }

  function getSheetByNameOrThrow_(groupName) {
    var ss = openSpreadsheet_();
    var sheet = ss.getSheetByName(groupName);
    if (!sheet) {
      throw new Error('No existe la hoja/grupo: ' + groupName);
    }
    return sheet;
  }

  return {
    listValidGroups_: listValidGroups_,
    getStudentsByGroup_: getStudentsByGroup_,
    getStudentClockByNia_: getStudentClockByNia_,
    getStudentClockByEmail_: getStudentClockByEmail_,
    findStudentGroupsByEmail_: findStudentGroupsByEmail_
  };
})();

/**
 * API: estado inicial para la UI.
 */
function apiGetInitialState() {
  var profile = resolveUserProfile_();
  if (!profile.authorized) {
    return {
      ok: false,
      profile: profile,
      groups: []
    };
  }

  if (profile.mode === 'teacher') {
    return {
      ok: true,
      profile: profile,
      groups: Data.listValidGroups_()
    };
  }

  return {
    ok: true,
    profile: profile,
    groups: profile.groups || []
  };
}

/**
 * API: listado de alumnos de un grupo (solo profesor).
 */
function apiGetStudentsByGroup(groupName) {
  var profile = resolveUserProfile_();
  if (!profile.authorized || profile.mode !== 'teacher') {
    throw new Error('No autorizado para listar alumnos de este grupo.');
  }

  return Data.getStudentsByGroup_(groupName);
}

/**
 * API: reloj de un alumno por NIA (solo profesor).
 */
function apiGetClockForStudent(groupName, nia) {
  var profile = resolveUserProfile_();
  if (!profile.authorized || profile.mode !== 'teacher') {
    throw new Error('No autorizado para consultar otros alumnos.');
  }

  return Data.getStudentClockByNia_(groupName, nia);
}

/**
 * API: reloj del alumno autenticado en el grupo indicado.
 */
function apiGetClockForCurrentUserInGroup(groupName) {
  var profile = resolveUserProfile_();
  if (!profile.authorized || profile.mode !== 'student') {
    throw new Error('Solo disponible en modo alumno.');
  }

  var allowedGroups = profile.groups || [];
  if (allowedGroups.indexOf(groupName) === -1) {
    throw new Error('No autorizado para consultar ese grupo.');
  }

  return Data.getStudentClockByEmail_(groupName, profile.email);
}
