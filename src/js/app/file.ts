import {
  getFileContent, uploadFile, getFiles, patchFile, getFile, deleteFile
} from '../api/datasets';
import { AssetId, props, gunzipIfNeeded, checkEmpty  } from '../utils';
import Spaces from './spaces';
import Dataset from './dataset';
import Base from './base';
import { TextEncoder, TextDecoder } from 'text-encoding';
import * as types from '../typings';

/* global FileReader */
/* eslint consistent-return: off */

/** File uploaded to API with activity and annotations */
export default class File extends Base implements types.IFile {
  id: types.id;
  name: string;
  description: string;
  contentType: string;
  size: number;
  parse: string;
  _rawContent: ArrayBuffer;
  _hasRawContent: boolean;

  /**
   * Creates a file
   * @param {Object} file - File object returned from API
   */
  constructor(file: Object) {
    super(Spaces.store);
    Object.assign(this, file, { _store: Spaces.store });
  }

  /**
   * Content of the file after being decoded
   * @returns {Promise<string>}
   */
  content(...args) : Promise<string> { return Spaces.getFileContentProvider().content(this, ...args); }

  /**
   * Set the contents of this file
   * @param {Promise<ArrayBuffer>} content - Promise which returns the file content
   * @param {cont} - the content of the file as bytes
   */
  // @ts-ignore
  setRawContent(...args) : Promise<File> { return Spaces.getFileContentProvider().setRawContent(this, ...args); }

  /**
   * Gets the raw content of a file
   * @returns {Promise<ArrayBuffer>}
   */
  rawContent(...args) : Promise<ArrayBuffer> { return Spaces.getFileContentProvider().rawContent(this, ...args); }

  /**
   * Gets the size of the raw content
   * @returns {number}
   */
  rawContentSize(...args) : number { return Spaces.getFileContentProvider().rawContentSize(this, ...args); }

  /**
   * Returns whether this file has raw content
   * @returns {boolean}
   */
  hasRawContent(...args) : boolean { return Spaces.getFileContentProvider().hasRawContent(this, ...args); }

  /**
   * Clears raw content from the cache. Not guaranteed to clear content, cache may ignore.
   * Should be used to ensure we don't sent content in memory to the main thread.
   */
  clearRawContent(...args) { return Spaces.getFileContentProvider().clearRawContent(this, ...args); }


  // Returned from Spaces.getContentProvider as get
  static __content(file: File, encoding = 'utf8', rcPromise = undefined) : Promise<string> {
    if (file.hasRawContent()) {
      const decoder = new TextDecoder(encoding);
      if (!rcPromise) {
        rcPromise = file.rawContent();
      }
      return rcPromise
        .then((content) => {
          if (!content) {
            return Promise.reject(new Error('content undefined, rawContent must return an ArrayBuffer'));
          }
          return decoder.decode(new DataView(content));
        });
    }
    return Promise.reject(new Error('raw content does not exist'));
  }

  // Returned from Spaces.getContentProvider as set
  static __setRawContent(file: File, cont: Promise<ArrayBuffer>) : Promise<File> {
    if (typeof cont.then !== 'function') {
      return Promise.reject(new Error('content must be a promise'));
    }
    return cont.then((content) => {
      file._rawContent = content;
      return Promise.resolve(file);
    });
  }

  static __rawContent(file: File) { if (!file._rawContent) return Promise.reject(new Error('raw content does not exist')); return Promise.resolve(file._rawContent); }

  static __rawContentSize(file: File) { return file._rawContent ? file._rawContent.byteLength : 0; }

  static __hasRawContent(file: File) { return file._rawContent !== undefined; }

  static __clearRawContent(file: File) { file._rawContent = null; return file; }

  static __getFromCache(id: types.id) { return Promise.reject(new Error('cache not implemented')); }

  static __storeInCache(id: types.id, content: Promise<ArrayBuffer>) { return Promise.reject(new Error('cache not implemented')); }

  /**
   * Returns URL for this file
   * @returns {string}
   */
  url() : string { return File.url(this.id); }

  /**
   * Returns URL for the file given a file id
   * @returns {string}
   */
  static url(fid : types.id) : string {
    if (fid === undefined || fid.space_id === undefined || fid.dataset_id === undefined || fid.item_id === undefined) {
      return undefined;
    }
    return `/files/${fid.space_id}/${fid.dataset_id}/${fid.item_id}`;
  }

  /**
   * Returns non-private file properties in a shallow object copy
   * @returns {object}
   */
  props() : Object { return props(this); }

  /**
   * Fetch a file from the API
   * @param {object} stream - Stream to pipe output to
   * @returns {Promise<File>}
   */
  load(stream: any) : Promise<File> {
    if (this.hasRawContent()) {
      return Promise.resolve(this);
    }
    const ret = <File>this.copy();
    return File.load(ret, stream);
  }

  /**
   * Fetches a file from the API
   * @param {(File|string)} fileOrId - File to return or string ID
   * @param {object} stream - Stream to pipe to, otherwise return data in the object itself
   * @param {bool} download - Download data
   * @returns {File}
   */
  static load(fileOrId: File, stream?: Object, download?: boolean) : Promise<File>;
  static load(fileOrId: types.id, stream?: Object, download?: boolean) : Promise<File>;
  static load(fileOrId, stream, download = true) {
    let id;
    let ret;
    let filePromise;
    if (fileOrId === undefined) {
      return Promise.reject('fileOrId undefined');
    }
    if (!(fileOrId instanceof File)) {
      id = new AssetId(fileOrId);
      if (!id.valid() && !(fileOrId instanceof File)) {
        return Promise.reject('fileOrId is not a valid File object or a valid AssetId');
      }
      filePromise = getFile(id.space_id, id.dataset_id, id.item_id)
        .then(payload => (
          checkEmpty(payload, () => (new File(payload.items[0])))
        ));
    } else {
      id = fileOrId.id;
      filePromise = Promise.resolve(fileOrId);
    }
    if (!id) {
      return Promise.reject('File id undefined');
    }
    return filePromise
      .then((payload) => {
        ret = payload;
        if (download) {
          const dlOptions = {
            compress: true
          }
          if (payload.content_type === 'application/gzip') {
            dlOptions.compress = false;
          }
          return Spaces.getFileContentProvider().getFromCache(id)
            .catch(() => {
              return getFileContent(id.space_id, id.dataset_id, id.item_id, dlOptions)
                .then((res) => {
                  if (stream) {
                    res.body.pipe(stream);
                    return Promise.resolve();
                  }
                  return res.arrayBuffer();
                });
            })
            .then((filecontent) => {
              if (stream) {
                return Promise.resolve(ret);
              }
              Spaces.getFileContentProvider().storeInCache(id, Promise.resolve(filecontent))
                .catch(() => {});
              return ret.setRawContent(Promise.resolve(filecontent));
            });
        }
        return Promise.resolve(ret);
      });
  }

  /**
   * Saves a File to the API
   * @param {(Dataset|string)} dataset - Parent dataset object or Dataset ID as serialized by AssetID
   * @param {string} name - Name of the file
   * @param {string} [description] - Description of the file (optional)
   * @param {string} contentType - Content type of the file (MIME)
   * @param {number} size - Size of the file
   * @param {string} content - Content of the file
   */
  static create(dataset: types.id, name: string, description: string, contentType: string, size: number, content: any);
  static create(dataset: Dataset, name: string, description: string, contentType: string, size: number, content: any);
  static create(dataset, name, description, contentType, size, content) {
    let id;
    if (dataset === undefined) {
      return Promise.reject('dataset undefined');
    }
    if (!(dataset instanceof Dataset)) {
      id = new AssetId(dataset);
      if (!id.valid() && !(dataset instanceof Dataset)) {
        return Promise.reject('dataset is not a valid Dataset object or valid AssetId');
      }
    } else {
      id = dataset.id;
    }
    if (!id) {
      return Promise.reject('id undefined');
    }
    if (name === undefined) {
      return Promise.reject('name undefined');
    }
    if (content === undefined) {
      return Promise.reject('content undefined');
    }
    if (size === undefined) {
      return Promise.reject('size undefined');
    }
    if (contentType === undefined) {
      return Promise.reject('contentType undefined');
    }

    return uploadFile(id.space_id, id.item_id, name, description, contentType, size, content)
      .catch((e) => (Promise.reject(e)))
      .then((payload) => {
        if (payload.count > 0) {
          return new Promise((resolve) => {
            const f = new File(payload.items[0]);
            if (typeof (content) === 'string' || content instanceof String) {
              const encoder = new TextEncoder('utf8');
              const buf = encoder.encode(content).buffer; // TextEncoder returns UInt8Array
              f.setRawContent(Promise.resolve(buf))
                .then((newf) => resolve(newf));
            } else if (content.constructor.name === 'ArrayBuffer' || content instanceof ArrayBuffer) {
              f.setRawContent(Promise.resolve(content))
                .then((newf) => resolve(newf));
            } else if (content.constructor.name === 'File' || content instanceof File) {
              const fr = new FileReader();
              fr.onloadend = (evt) => {
                // @ts-ignore
                if (evt.target.readyState === FileReader.DONE) {
                  // check to see if we need to decompress file ...
                  return new Promise((res, rej) => {
                    gunzipIfNeeded(f.name, fr.result, (err, buf) => {
                      if (err) {
                        rej(err);
                      }
                      f.setRawContent(Promise.resolve(buf))
                        .then((newf) => res(newf));
                    });
                  }).then(() => { resolve(f); });
                }
                // @ts-ignore
                return Promise.reject(`received onloadend with readyState=${evt.target.readyState}, file=${f.name}`);
              };
              fr.readAsArrayBuffer(content);
            } else {
              resolve(f);
            }
          });
        }
        return Promise.reject('Empty result set');
      });
  }

  /**
   * Lists files from the API for a dataset
   * @param {(Dataset|string)} dataset - Dataset object to fetch files for or DatasetID as serialized by AssetID
   * @returns {Promise<File[]>}
   */
  static list(dataset: Dataset) : Promise<Array<File>>;
  static list(dataset: types.id) : Promise<Array<File>>;
  static list(dataset) {
    let id;
    if (dataset === undefined) {
      return Promise.reject('dataset undefined');
    }
    if (!(dataset instanceof Dataset)) {
      id = new AssetId(dataset);
      if (!id.valid() && !(dataset instanceof Dataset)) {
        return Promise.reject('dataset is not a valid Dataset object or valid AssetId');
      }
    } else {
      id = dataset.id;
    }
    if (!id) {
      return Promise.reject('id undefined');
    }
    return getFiles(id.space_id, id.item_id)
      .then(payload => payload.items.map(f => new File(f)));
  }

  /**
   * Updates file with the API
   * @returns {Promise<File>}
   */
  update() : Promise<File> {
    // update dataset itself
    return patchFile(this, { parse: this.parse })
      .then((payload) => {
        if (payload.count > 0) {
          const ret = this.copy() as File;
          Object.assign(ret, payload.items[0]);
          return Promise.resolve(ret);
        }
        return Promise.reject('Empty result set');
      });
  }

  /**
   * Deletes a file with the API
   * @returns {Promise<File>}
   */
  delete() : Promise<File> {
    return deleteFile(this.id.space_id, this.id.dataset_id, this.id.item_id)
      .then((payload) => {
        if (payload.count > 0) {
          const ret = this.copy() as File;
          Object.assign(ret, payload.items[0]);
          return Promise.resolve(ret);
        }
        return Promise.reject('Empty result set');
      });
  }
}
