// @ts-ignore
import { Readable } from 'stream';
// @ts-ignore
import { gunzip } from 'zlib';
import * as types from '../typings';

/* eslint no-multi-spaces: off */

export function simpleObjectReturn(payload: types.IAPIPayload , obj: any): Promise<any> {
  const ret = obj.copy();
  Object.assign(ret, payload.items[0]);
  return Promise.resolve(ret);
}

export function checkEmpty(payload: types.IAPIPayload, callback: Function): Promise<any> {
  if (payload.count > 0) {
    return callback();
  }
  return Promise.reject('Empty result set');
}

export function props(orig: any): any {
  return Object.keys(orig)
    .filter(key => !key.startsWith('_'))
    .filter(key => key !== 'id')
    .reduce((obj, key) => {
      obj[key] = orig[key];
      return obj;
    }, {});
}

export function pushTo(arr: Array<any>, el: any): Array<any> {
  arr = arr || [];
  arr.push(el);
  return arr;
}

export function isGzipFile(name: string): boolean {
  return name.endsWith('.gz') || name.endsWith('.tgz');
}

export function isGzipBuffer(buf: any): boolean {
  if (!buf || buf.length < 3) {
    return false;
  }
  return buf[0] === 0x1F && buf[1] === 0x8B && buf[2] === 0x08;
}

export function gunzipIfNeeded(name: string, buf: any, callback: Function) {
  if (isGzipFile(name) && isGzipBuffer(new Uint8Array(buf))) {
    console.log(`${Date.now()} - decompressing file=${name} ...`);
    // @ts-ignore
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
