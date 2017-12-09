import { Readable } from 'stream';
import { gunzip } from 'zlib';

/* eslint no-multi-spaces: off */

export function hackParent(hackArr, newParent) {
  hackArr.forEach(ha => ha._parent = newParent);
}

export function simpleObjectReturn(payload, obj) {
  const ret = obj.copy();
  Object.assign(ret, payload.items[0]);
  return Promise.resolve(ret);
}

export function checkEmpty(payload, callback) {
  if (payload.count > 0) {
    return callback();
  }
  return Promise.reject('Empty result set');
}

export function props(orig) {
  return Object.keys(orig)
    .filter(key => !key.startsWith('_'))
    .filter(key => key !== 'id')
    .reduce((obj, key) => {
      obj[key] = orig[key];
      return obj;
    }, {});
}

export function pushTo(arr, el) {
  arr = arr || [];
  arr.push(el);
  return arr;
}

export function isTarArchive(name) {
  return name.endsWith('.tar') || name.endsWith('.tgz') || name.endsWith('.tar.gz');
}

export function isZipArchive(name) {
  return name.toLowerCase().endsWith('.zip');
}

export function isArchiveFile(name) {
  return isTarArchive(name) || isZipArchive(name);
}

export function isGzipFile(name) {
  return name.endsWith('.gz') || name.endsWith('.tgz');
}

export function isGzipBuffer(buf) {
  if (!buf || buf.length < 3) {
    return false;
  }
  return buf[0] === 0x1F && buf[1] === 0x8B && buf[2] === 0x08;
}

export function gunzipIfNeeded(name, buf, callback) {
  if (isGzipFile(name) && isGzipBuffer(new Uint8Array(buf))) {
    console.log(`${Date.now()} - decompressing file=${name} ...`);
    gunzip(Buffer.from(buf), (err, data) => {
      console.log(`${Date.now()} - decompression of file=${name}, in=${buf.byteLength}, out=${data.byteLength} completed`);
      if (err) {
        callback(err);
      } else {
        callback(err, data.buffer);
      }
    });
  } else {
    callback(null, buf);
  }
}

export class StrStream extends Readable {
  constructor(s) {
    super();
    this.s = s;
    this.off = 0;
    this.len = this.s.byteLength;
  }

  _read(n) {
    if (this.off >= this.len) {
      this.push(null);
    } else {
      n = Math.min(n, this.len - this.off);
      this.push(Buffer.from(this.s.slice(this.off, this.off + n)));
      this.off += n;
    }
  }
}
