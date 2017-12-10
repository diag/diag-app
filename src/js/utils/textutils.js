const crypto = require('crypto');

const base62chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/* eslint no-restricted-syntax: off */
// generates a random string in base62 [0-9a-zA-Z]
exports.random = (length) => {
  const randomBytes = crypto.randomBytes(length);
  let result = '';

  let cursor = 0;
  for (const c of randomBytes) {
    cursor += c;
    result += base62chars[cursor % 62];
  }

  return result;
};

exports.base62 = (integer, width) => {
  let s = '';
  while (integer > 0) {
    s = base62chars[integer % 62] + s;
    integer = Math.floor(integer / 62);
  }

  width = width || 1;
  if (width > s.length) {
    for (let i = width - s.length; i > 0; i--) { s = `0${s}`; }
  }
  return s;
};

/* eslint no-mixed-operators: off */
exports.base62decode = (s) => {
  let r = 0;

  for (const c of s) {
    const i = base62chars.indexOf(c);
    if (i < 0) { throw Error(`Invalid base62 char=${c}`); }
    r = r * base62chars.length + i;
  }
  return r;
};


// lexicographical order preserving variable length base62 encoding,
// numbers are encoded as: <len><base62(n)>
// where len is base62(length-of-base62(n))
// examples:
//  0 -> 10
//  1 -> 11
// 62 -> 210
// 63 -> 211
exports.lb62e = (integer) => {
  const s = this.base62(integer);
  if (s.length > 62) { throw Error(`Integer out of range for LB62 encoding, value=${integer}`); }
  return base62chars[s.length] + s;
};
exports.lb62d = (s) => {
  if (s.length < 2 || this.base62decode(s[0]) !== s.length - 1) { throw Error(`Invalid LB62 encoded string, value=${s}`); }
  return this.base62decode(s.substr(1));
};
