var Pairings = (function () {
  function generate12Hours_(students, targetRounds) {
    var count = students.length;
    var rounds = [];

    if (count < 2) {
      return { rounds: [], warning: 'No hay suficientes alumnos para emparejar.' };
    }

    var usedPairs = {};
    var trioCounts = {};
    students.forEach(function (s) {
      trioCounts[s.nia] = 0;
    });

    var hardUpperBound = computeHardUpperBound_(count);
    var maxGoal = Math.min(targetRounds, hardUpperBound);

    if (count % 2 === 0) {
      rounds = buildEvenRoundRobin_(students, maxGoal);
    } else {
      rounds = buildOddRoundsWithSearch_(students, maxGoal, usedPairs, trioCounts);
    }

    var warning = '';
    if (rounds.length < targetRounds) {
      warning = 'No se han podido generar 12 rondas únicas sin repetir compañeros. ' +
        'Máximo generado: ' + rounds.length +
        '. Límite teórico para este grupo: ' + hardUpperBound + '.';
    }

    return {
      rounds: rounds,
      warning: warning
    };
  }

  function computeHardUpperBound_(n) {
    if (n % 2 === 0) {
      return n - 1;
    }
    var totalUniquePairs = (n * (n - 1)) / 2;
    var pairContactsPerRound = (n + 3) / 2; // (n-3)/2 parejas + 3 contactos en el trío
    return Math.floor(totalUniquePairs / pairContactsPerRound);
  }

  function buildEvenRoundRobin_(students, roundsNeeded) {
    var ids = students.map(function (s) { return s.nia; });
    var rounds = [];

    var arr = Utils.cloneArray_(ids);
    var n = arr.length;

    for (var r = 0; r < n - 1 && rounds.length < roundsNeeded; r++) {
      var groups = {};

      for (var i = 0; i < n / 2; i++) {
        var a = arr[i];
        var b = arr[n - 1 - i];
        groups[a] = [b];
        groups[b] = [a];
      }

      rounds.push({ groups: groups, hasTrio: false });
      arr = rotateKeepingFirst_(arr);
    }

    return rounds;
  }

  function buildOddRoundsWithSearch_(students, roundsNeeded, usedPairs, trioCounts) {
    var ids = students.map(function (s) { return s.nia; });
    var rounds = [];

    for (var roundIndex = 0; roundIndex < roundsNeeded; roundIndex++) {
      var built = buildOneOddRound_(ids, usedPairs, trioCounts, roundIndex);
      if (!built) {
        break;
      }

      rounds.push({ groups: built.groups, hasTrio: true });
      markRoundPairsAsUsed_(built.groups, usedPairs);
      built.trio.forEach(function (nia) {
        trioCounts[nia] += 1;
      });
    }

    return rounds;
  }

  function buildOneOddRound_(ids, usedPairs, trioCounts, roundIndex) {
    var ordered = Utils.rotateArray_(ids, roundIndex % ids.length);

    var trioCandidates = buildTrioCandidates_(ordered, usedPairs, trioCounts);
    for (var t = 0; t < trioCandidates.length; t++) {
      var trio = trioCandidates[t];
      var remaining = ordered.filter(function (id) {
        return trio.indexOf(id) === -1;
      });

      var matching = buildPerfectMatching_(remaining, usedPairs, roundIndex);
      if (!matching) {
        continue;
      }

      var groups = {};

      for (var p = 0; p < matching.length; p++) {
        var pair = matching[p];
        groups[pair[0]] = [pair[1]];
        groups[pair[1]] = [pair[0]];
      }

      groups[trio[0]] = [trio[1], trio[2]];
      groups[trio[1]] = [trio[0], trio[2]];
      groups[trio[2]] = [trio[0], trio[1]];

      return { groups: groups, trio: trio };
    }

    return null;
  }

  function buildTrioCandidates_(orderedIds, usedPairs, trioCounts) {
    var candidates = [];

    for (var i = 0; i < orderedIds.length - 2; i++) {
      for (var j = i + 1; j < orderedIds.length - 1; j++) {
        for (var k = j + 1; k < orderedIds.length; k++) {
          var a = orderedIds[i];
          var b = orderedIds[j];
          var c = orderedIds[k];

          if (isUsed_(usedPairs, a, b) || isUsed_(usedPairs, a, c) || isUsed_(usedPairs, b, c)) {
            continue;
          }

          candidates.push({
            trio: [a, b, c],
            score: trioCounts[a] + trioCounts[b] + trioCounts[c]
          });
        }
      }
    }

    candidates.sort(function (x, y) {
      if (x.score !== y.score) {
        return x.score - y.score;
      }
      return x.trio.join('|') < y.trio.join('|') ? -1 : 1;
    });

    return candidates.map(function (c) { return c.trio; });
  }

  function buildPerfectMatching_(ids, usedPairs, roundIndex) {
    if (!ids.length) {
      return [];
    }

    var first = ids[0];
    var rest = ids.slice(1);

    var sortedCandidates = rest.slice().sort(function (a, b) {
      return partnerPriority_(first, a, ids, roundIndex) - partnerPriority_(first, b, ids, roundIndex);
    });

    for (var i = 0; i < sortedCandidates.length; i++) {
      var partner = sortedCandidates[i];
      if (isUsed_(usedPairs, first, partner)) {
        continue;
      }

      var next = rest.filter(function (id) { return id !== partner; });
      var sub = buildPerfectMatching_(next, usedPairs, roundIndex + 1);
      if (sub) {
        sub.unshift([first, partner]);
        return sub;
      }
    }

    return null;
  }

  function partnerPriority_(a, b, ids, roundIndex) {
    var ai = ids.indexOf(a);
    var bi = ids.indexOf(b);
    if (ai < 0 || bi < 0) {
      return Number.MAX_SAFE_INTEGER;
    }
    var n = ids.length;
    return (bi - ai - roundIndex + n * 4) % n;
  }

  function markRoundPairsAsUsed_(groups, usedPairs) {
    var handled = {};
    var keys = Object.keys(groups);

    for (var i = 0; i < keys.length; i++) {
      var a = keys[i];
      var mates = groups[a];
      for (var j = 0; j < mates.length; j++) {
        var b = mates[j];
        var key = Utils.pairKey_(a, b);
        if (!handled[key]) {
          usedPairs[key] = true;
          handled[key] = true;
        }
      }
    }
  }

  function isUsed_(usedPairs, a, b) {
    return !!usedPairs[Utils.pairKey_(a, b)];
  }

  function rotateKeepingFirst_(arr) {
    if (arr.length <= 2) {
      return Utils.cloneArray_(arr);
    }

    var first = arr[0];
    var rest = arr.slice(1);
    rest.unshift(rest.pop());
    return [first].concat(rest);
  }

  return {
    generate12Hours_: generate12Hours_
  };
})();
