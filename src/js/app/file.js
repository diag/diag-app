import {
  getFileContent, uploadFile, getFiles, patchFile, getFile, deleteFile
} from '../api/datasets';
import { AssetId } from '../utils';
import { props, gunzipIfNeeded, checkEmpty } from '../utils/apputils';
import Spaces from './spaces';
import Dataset from './dataset';
import Base from './base';
import { TextEncoder, TextDecoder } from 'text-encoding';

/* global FileReader */
/* eslint consistent-return: off */

/** File uploaded to API with activity and annotations */
export default class File extends Base {
  /**
   * Creates a file
   * @param {Object} file - File object returned from API
   */
  constructor(file) {
    super(Spaces.store);
    Object.assign(this, file, { _store: Spaces.store });
  }

  /**
   * Content of the file after being decoded
   * @returns {string}
   */
  content(encoding = 'utf8') {
    const decoder = new TextDecoder(encoding);
    return decoder.decode(new DataView(this._rawContent));
  }

  /**
   * Set the contents of this file
   * @param {cont} - the content of the file as bytes
   */
  setRawContent(cont) { this._rawContent = cont; }

  rawContent() { return this._rawContent; }

  rawContentSize() { return this._rawContent ? this._rawContent.byteLength : 0; }

  /**
   * Returns URL for this file
   * @returns {string}
   */
  url() { return File.url(this.id); }

  /**
   * Returns URL for the file given a file id
   * @returns {string}
   */
  static url(fid) {
    if (fid === undefined || fid.space_id === undefined || fid.dataset_id === undefined || fid.item_id === undefined) {
      return undefined;
    }
    return `/files/${fid.space_id}/${fid.dataset_id}/${fid.item_id}`;
  }

  /**
   * Returns non-private file properties in a shallow object copy
   * @returns {object}
   */
  props() { return props(this); }

  /**
   * Fetch a file from the API
   * @param {object} stream - Stream to pipe output to
   * @returns {Promise<File>}
   */
  load(stream) {
    if (this.rawContent() !== undefined) {
      return Promise.resolve(this);
    }
    const ret = this.copy();
    return File.load(ret, stream);
  }

  /**
   * Fetches a file from the API
   * @param {(File|string)} fileOrId - File to return or string ID
   * @param {object} stream - Stream to pipe to, otherwise return data in the object itself
   * @param {bool} download - Download data
   * @returns {File}
   */
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
    return filePromise
      .then((payload) => {
        ret = payload;
        if (download) {
          const dlOptions = {};
          if (payload.content_type === 'application/gzip') {
            dlOptions.compress = false;
          }
          return getFileContent(id.space_id, id.dataset_id, id.item_id, dlOptions)
            .then((res) => {
              if (stream) {
                res.body.pipe(stream);
                return Promise.resolve();
              }
              return res.arrayBuffer();
            })
            .then((filecontent) => {
              if (stream) {
                return Promise.resolve(ret);
              }
              ret.setRawContent(filecontent);
              return Promise.resolve(ret);
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
              f.setRawContent(buf);
              resolve(f);
            } else if (content.constructor.name === 'ArrayBuffer' || content instanceof ArrayBuffer) {
              f.setRawContent(content);
              resolve(f);
            } else if (content.constructor.name === 'File' || content instanceof File) {
              const fr = new FileReader();
              fr.onloadend = (evt) => {
                if (evt.target.readyState === FileReader.DONE) {
                  // check to see if we need to decompress file ...
                  return new Promise(res => {
                    gunzipIfNeeded(f.name, fr.result, (err, buf) => {
                      f.setRawContent(buf);
                      res(f);
                    });
                  }).then(() => { resolve(f); });
                }
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
  static list(dataset) {
    let id;
    let checkFile = false;
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
      checkFile = true;
    }
    return getFiles(id.space_id, id.item_id)
      .then(payload => {
        const files = payload.items.map(f => {
          const mf = new File(f);
          // TODO: consider potential cache size bloat
          if (checkFile) {
            const cf = dataset.file(mf.itemid());
            if (cf && cf.itemid() !== undefined) {
              mf.setRawContent(cf.rawContent());
            }
          }
          return mf;
        });
        return files;
      });
  }

  /**
   * Updates file with the API
   * @returns {Promise<File>}
   */
  update() {
    // update dataset itself
    return patchFile(this, { parse: this.parse })
      .then((payload) => {
        if (payload.count > 0) {
          // HACK shouldn't mutate existing state, but this saves us from having to reload the whole dataset from the server
          const ret = this.copy();
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
  delete() {
    return deleteFile(this.id.space_id, this.id.dataset_id, this.id.item_id)
      .then((payload) => {
        if (payload.count > 0) {
          const ret = this.copy();
          Object.assign(ret, payload.items[0]);
          return Promise.resolve(ret);
        }
        return Promise.reject('Empty result set');
      });
  }
}
