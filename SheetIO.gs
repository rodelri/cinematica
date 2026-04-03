var SheetIO = (function () {
  var START_COLUMN = 4; // D
  var HOURS_COUNT = 12;

  function readStudentsFromSheet_(sheet) {
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return [];
    }

    var values = sheet.getRange(2, 1, lastRow - 1, 3).getValues();
    var students = [];
    var seenNia = {};

    for (var i = 0; i < values.length; i++) {
      var rowNumber = i + 2;
      var nia = Utils.asCleanString_(values[i][0]);
      var email = Utils.asCleanString_(values[i][1]);
      var name = Utils.asCleanString_(values[i][2]);

      if (!nia && !email && !name) {
        continue;
      }

      if (!nia || !email || !name) {
        continue;
      }

      if (seenNia[nia]) {
        throw new Error('NIA duplicado detectado: ' + nia + ' (fila ' + rowNumber + ').');
      }

      seenNia[nia] = true;
      students.push({
        row: rowNumber,
        nia: nia,
        email: email,
        name: name
      });
    }

    return students;
  }

  function prepareHourColumns_(sheet, students) {
    var headers = [];
    for (var i = 1; i <= HOURS_COUNT; i++) {
      headers.push('HORA_' + i);
    }
    sheet.getRange(1, START_COLUMN, 1, HOURS_COUNT).setValues([headers]);

    var maxRow = Math.max(sheet.getLastRow(), 2);
    sheet.getRange(2, START_COLUMN, maxRow - 1, HOURS_COUNT).clearContent();
  }

  function writePairingsToSheet_(sheet, students, rounds) {
    var niaToIndex = {};
    var niaToName = {};

    for (var i = 0; i < students.length; i++) {
      niaToIndex[students[i].nia] = i;
      niaToName[students[i].nia] = students[i].name;
    }

    var output = [];
    for (var s = 0; s < students.length; s++) {
      output.push(new Array(HOURS_COUNT).fill(''));
    }

    for (var r = 0; r < rounds.length; r++) {
      var groups = rounds[r].groups;
      var keys = Object.keys(groups);

      for (var k = 0; k < keys.length; k++) {
        var nia = keys[k];
        var mates = groups[nia];
        var rowIndex = niaToIndex[nia];

        if (rowIndex === undefined || !mates || !mates.length) {
          continue;
        }

        var text = mates
          .map(function (mateNia) {
            return mateNia + ' - ' + niaToName[mateNia];
          })
          .join(' | ');

        output[rowIndex][r] = text;
      }
    }

    for (var i2 = 0; i2 < students.length; i2++) {
      sheet.getRange(students[i2].row, START_COLUMN, 1, HOURS_COUNT).setValues([output[i2]]);
    }
  }

  return {
    readStudentsFromSheet_: readStudentsFromSheet_,
    prepareHourColumns_: prepareHourColumns_,
    writePairingsToSheet_: writePairingsToSheet_
  };
})();
