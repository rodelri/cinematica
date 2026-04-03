var Utils = (function () {
  function asCleanString_(value) {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value).trim();
  }

  function pairKey_(a, b) {
    return a < b ? a + '|' + b : b + '|' + a;
  }

  function cloneArray_(arr) {
    return arr.slice();
  }

  function rotateArray_(arr, shift) {
    if (!arr.length) {
      return [];
    }
    var n = arr.length;
    var s = ((shift % n) + n) % n;
    return arr.slice(s).concat(arr.slice(0, s));
  }

  return {
    asCleanString_: asCleanString_,
    pairKey_: pairKey_,
    cloneArray_: cloneArray_,
    rotateArray_: rotateArray_
  };
})();
