import {
  getFileContent, uploadFile,
} from '../api/datasets';
import { props, isArchiveFile, gunzipIfNeeded } from '../utils/apputils';
import Dataset from './dataset';
import { TextEncoder, TextDecoder } from 'text-encoding';

/* global FileReader */

/** File uploaded to API with activity and annotations */
export default class File {
  /**
   * Creates a file
   * @param {Dataset} parent - Dataset object pointing to parent
   * @param {Object} file - File object returned from API
   */
  constructor(parent, file) {
    Object.assign(this, file);
    this._parent = parent;
  }

  /**
   * Shallow copy of this file
   * @returns {File}
  */
  copy() { return new File(this._parent, this); }

  /**
   * File ID as a string
   * @returns {string}
  */
  itemid() { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * The parent Space
   * @returns {Space}
   */
  space() { return this.dataset().space(); }

  /**
   * The parent Dataset
   * @returns {Dataset}
   */
  dataset() { return this._parent; }

  /**
   * Activity
   * @returns {Activity[]}
   */
  activity() { return this.space().activity().filter(a => a.id.file_id === this.itemid()); }

  /**
   * Annotations
   * @returns {Annotations[]}
   */
  annotations() { return (this.dataset().annotations(this.itemid()) || []); }

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
   * @returns {Promise<File>}
   */
  load() {
    if (this.rawContent() !== undefined) {
      return Promise.resolve(this);
    }
    const ret = this.copy();
    return getFileContent(this.space().itemid(), this.dataset().itemid(), this.itemid())
      .then((payload) => {
        ret.setRawContent(payload);
        return Promise.resolve(ret);
      });
  }
  /**
   * Saves a File to the API
   * @param {Dataset} dataset - Parent dataset object
   * @param {string} name - Name of the file
   * @param {string} [description] - Description of the file (optional)
   * @param {string} contentType - Content type of the file (MIME)
   * @param {number} size - Size of the file
   * @param {string} content - Content of the file
   */
  static create(dataset, name, description, contentType, size, content) {
    if (dataset === undefined) {
      return Promise.reject('dataset undefined');
    }
    if (!(dataset instanceof Dataset)) {
      return Promise.reject('dataset is not Dataset object');
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

    return uploadFile(dataset.space().itemid(), dataset.itemid(), name, description, contentType, size, content)
      .catch((e) => (Promise.reject(e)))
      .then((payload) => {
        if (payload.count > 0) {
          return new Promise((resolve) => {
            const f = new File(dataset, payload.items[0]);
            if (typeof (content) === 'string' || content instanceof String) {
              const encoder = new TextEncoder('utf8');
              const buf = encoder.encode(content).buffer; // TextEncoder returns UInt8Array
              f.setRawContent(buf);
              dataset.addFileToIndex(f);
              resolve(f);
            } else if (content.constructor.name === 'File' || content instanceof File) {
              const fr = new FileReader();
              fr.onloadend = (evt) => {
                if (evt.target.readyState === FileReader.DONE) { // DONE == 2
                  // check to see if we need to decompress file ...
                  const p = new Promise((res) => {
                    gunzipIfNeeded(f.name, fr.result, (err, buf) => {
                      f.setRawContent(buf);
                      res();
                    });
                  });

                  // at this point f.getRawContent() will contain uncompressed data (might still be archived tho)
                  return p.then(() => {
                    if (!isArchiveFile(f.name)) {
                      dataset.addFileToIndex(f); // simple file
                      resolve(f);
                    } else {
                      const toAdd = [];
                      const toRemove = [];
                      console.log(`${Date.now()} - will expand local archive=${f.name} ...`);

                      return dataset._expandArchive(f, toAdd, toRemove)
                        .then(() => {
                          // index files
                          toAdd.forEach(dataset.addFileToIndex.bind(dataset));

                          // remove/add files
                          dataset._updateFiles(toAdd, toRemove);
                          resolve(f);
                        });
                    }
                  });
                }
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
}
