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

  function createGroupPdfForGroup_(groupName) {
    var students = getStudentsByGroup_(groupName);
    if (!students.length) {
      throw new Error('No hay alumnos válidos en el grupo seleccionado.');
    }

    var entries = students.map(function (student) {
      var clockData = getStudentClockByNia_(groupName, student.nia);
      return {
        studentName: clockData.student.name,
        hours: clockData.hours
      };
    });

    var html = buildGroupPdfHtml_(groupName, entries);
    var blob = HtmlService
      .createHtmlOutput(html)
      .getBlob()
      .getAs(MimeType.PDF)
      .setName('Relojes_' + groupName + '_' + new Date().getTime() + '.pdf');

    var file = DriveApp.createFile(blob);
    return {
      name: file.getName(),
      url: file.getUrl()
    };
  }

  function buildGroupPdfHtml_(groupName, entries) {
    var pages = entries.map(function (entry) {
      return '<section class=\"page\">' +
        '<h2>' + escapeHtml_(groupName) + ' · ' + escapeHtml_(entry.studentName) + '</h2>' +
        '<div class=\"clock\">' +
        buildTickHtml_() +
        '<div class=\"hour-hand\"></div><div class=\"minute-hand\"></div>' +
        '<div class=\"center\">' + escapeHtml_(entry.studentName) + '</div>' +
        buildHourNodesHtml_(entry.hours) +
        '</div></section>';
    }).join('');

    return '<!DOCTYPE html><html><head><meta charset=\"utf-8\"><style>' +
      'body{font-family:Arial,sans-serif;margin:0} .page{page-break-after:always;padding:16px;text-align:center}' +
      '.page:last-child{page-break-after:auto} h2{margin:0 0 12px 0;font-size:18px;color:#1e3a8a}' +
      '.clock{position:relative;width:700px;height:700px;margin:0 auto;border:8px solid #dbe7ff;border-radius:50%;background:radial-gradient(circle at center,#fff 30%,#eef4ff 100%);}' +
      '.tick{position:absolute;left:50%;top:50%;transform-origin:0 0;border-radius:999px}' +
      '.tick.minute{width:9px;height:2px;background:rgba(37,99,235,.25)} .tick.hour{width:15px;height:3px;background:#2563eb}' +
      '.hour-hand,.minute-hand{position:absolute;top:50%;left:50%;transform-origin:0 50%;border-radius:999px}' +
      '.hour-hand{width:22%;height:6px;background:#1e40af;transform:translateY(-50%) rotate(0deg)}' +
      '.minute-hand{width:33%;height:4px;background:#60a5fa;transform:translateY(-50%) rotate(-90deg)}' +
      '.hour-hand:after,.minute-hand:after{content:\"\";position:absolute;right:-9px;top:50%;transform:translateY(-50%);width:0;height:0;border-top:6px solid transparent;border-bottom:6px solid transparent}' +
      '.hour-hand:after{border-left:9px solid #1e40af}.minute-hand:after{border-left:9px solid #60a5fa}' +
      '.center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:36%;min-height:78px;border-radius:50%;border:2px solid #dbe7ff;background:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;padding:8px;z-index:2}' +
      '.node{position:absolute;width:132px;min-height:84px;padding:8px;border-radius:12px;border:1px solid #e5e7eb;background:#fff;text-align:center;transform:translate(-50%,-50%);font-size:12px}' +
      '.node.pair{background:#eff6ff;border-color:#93c5fd}.node.trio{background:#f5f3ff;border-color:#c4b5fd}.node.empty{background:#f9fafb;border-color:#e5e7eb}' +
      '.num{display:block;font-weight:700;margin-bottom:4px}' +
      '</style></head><body>' + pages + '</body></html>';
  }

  function buildTickHtml_() {
    var html = '';
    for (var i = 0; i < 60; i++) {
      var isHour = i % 5 === 0;
      var radius = isHour ? 332 : 338;
      html += '<div class=\"tick ' + (isHour ? 'hour' : 'minute') + '\" style=\"transform:rotate(' + (i * 6) + 'deg) translate(0,-' + radius + 'px);\"></div>';
    }
    return html;
  }

  function buildHourNodesHtml_(hours) {
    var html = '';
    var size = 700;
    var radius = size * 0.41;
    for (var i = 1; i <= 12; i++) {
      var hourInfo = (hours || []).filter(function (item) { return item.hour === i; })[0] || { text: CONFIG.EMPTY_SLOT_LABEL, type: 'empty' };
      var angle = ((i - 3) * 30) * Math.PI / 180;
      var x = (size / 2) + radius * Math.cos(angle);
      var y = (size / 2) + radius * Math.sin(angle);
      html += '<div class=\"node ' + hourInfo.type + '\" style=\"left:' + x + 'px;top:' + y + 'px\">' +
        '<span class=\"num\">' + i + '</span>' + escapeHtml_(hourInfo.text) + '</div>';
    }
    return html;
  }

  function escapeHtml_(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  return {
    listValidGroups_: listValidGroups_,
    getStudentsByGroup_: getStudentsByGroup_,
    getStudentClockByNia_: getStudentClockByNia_,
    getStudentClockByEmail_: getStudentClockByEmail_,
    findStudentGroupsByEmail_: findStudentGroupsByEmail_,
    createGroupPdfForGroup_: createGroupPdfForGroup_
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

/**
 * API: crea PDF con un reloj por alumno del grupo (solo profesor/admin).
 */
function apiCreateGroupPdf(groupName) {
  var profile = resolveUserProfile_();
  if (!profile.authorized || profile.mode !== 'teacher') {
    throw new Error('No autorizado para generar PDF del grupo.');
  }
  return Data.createGroupPdfForGroup_(groupName);
}
