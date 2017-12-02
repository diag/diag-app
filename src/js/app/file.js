import {
  getFileContent, uploadFile, getFiles, patchFile,
} from '../api/datasets';
import { props, isArchiveFile, gunzipIfNeeded, isZipArchive, isTarArchive, StrStream } from '../utils/apputils';
import { extract } from 'tar-stream';
import JSZip from 'jszip';
import Spaces from './spaces';
import Dataset from './dataset';
import Base from './base';
import { TextEncoder, TextDecoder } from 'text-encoding';
import isEqual from 'lodash/fp/isEqual';

/* global FileReader */

/** File uploaded to API with activity and annotations */
export default class File extends Base {
  /**
   * Creates a file
   * @param {Object} file - File object returned from API
   */
  constructor(file) {
    super(Spaces.store);
    Object.assign(this, file);
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
            const f = new File(payload.items[0]);
            if (typeof (content) === 'string' || content instanceof String) {
              const encoder = new TextEncoder('utf8');
              const buf = encoder.encode(content).buffer; // TextEncoder returns UInt8Array
              f.setRawContent(buf);
              dataset.addFileToIndex(f);
              resolve(f);
            } else if (content.constructor.name === 'ArrayBuffer' || content instanceof ArrayBuffer) {
              f.setRawContent(content);
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

  /**
   * Loads files from the API
   * @param {Dataset} dataset - Dataset to fetch files for
   * @returns {Promise<File[]>}
   */
  static load(dataset) {
    if (dataset === undefined) {
      return Promise.reject('dataset undefined');
    }
    if (!(dataset instanceof Dataset)) {
      return Promise.reject('dataset is not an instance of Dataset');
    }
    return getFiles(dataset.space().itemid(), dataset.itemid())
      .then(payload => (
        payload.items.map(f => {
          const mf = new File(f);
          // TODO: consider potential cache size bloat
          const cf = dataset.file(mf.itemid());
          if (cf) {
            mf.setRawContent(cf.rawContent());
          }
          return mf;
        })
      ))
      .then((files) => {
        let ret = [...files];
        // download and index files in the DS
        // TODO; move this to a bg task
        const startTime = Date.now();
        console.log(`${startTime} - download start`);
        const downloads = [];

        const filesToAdd = [];
        const filesToRemove = [];
        files.forEach((f) => {
          downloads.push(
            f.load()
              .then((newf) => {
                console.log(`${Date.now()} - downloaded file=${f.name}`);
                f.setRawContent(newf.rawContent()); // copy content from newF
                return File._expandArchive(newf, filesToAdd, filesToRemove);
              }).catch((err) => {
                console.error(`Failed to load contents of dataset=${dataset.name}, file=${f.name}, err=${err}`);
              })
          );
        });
        return Promise.all(downloads)
          .then(() => {
            // remove/add files
            ret = [...ret, ...filesToAdd].filter(f => filesToRemove.findIndex(fr => isEqual(fr.id, f.id)) === -1);
            // ret._updateFiles(filesToAdd, filesToRemove);
          })
          .then(() => {
            const endTime = Date.now();
            console.log(`${endTime} - download done in ${endTime - startTime} ms`);
          })
          .then(() => (Promise.resolve(ret)));
      })
      .catch((err) => {
        console.log(err);
      });
    // return getFiles(this.space().itemid(), this.itemid())
    //   .then(payload => (
    //     checkEmpty(payload, () => {
    //       const ret = this.copy();
    //       ret._files = payload.items.map(f => new File(ret, f)).reduce((files, f) => { files[f.itemid()] = f; return files; }, {});
    //       return ret;
    //       // return new Promise(resolve => resolve(ret));
    //     })
    //   ));
  }

  /* eslint prefer-template: off */
  static _expandArchive(f, toAdd, toRemove) {
    if (!isArchiveFile(f.name)) {
      return Promise.resolve('regular-file');
    }

    const addFileFromArchive = (name, bytes, size) => {
      const nf = f.copy();
      nf.id = Object.assign({}, f.id);
      nf.setRawContent(bytes);
      nf.id.item_id += ':' + toAdd.length;
      nf.name = f.name + '/' + name;
      nf.size = size;
      toAdd.push(nf);
    };

    if (isZipArchive(f.name)) {
      toRemove.push(f);
      return new Promise((resolve, reject) => {
        console.log(`processing zip archive, file=${f.name} ... `);
        JSZip.loadAsync(f.rawContent())
          .catch((err) => {
            reject(err);
          })
          .then((zip) => {
            const promises = [];
            zip.forEach((path, zipFile) => {
              if (zipFile.dir) {
                return; // nop
              }
              console.log(`${Date.now()} - start zipentry=${zipFile.name}...`);
              promises.push(
                zipFile.async('uint8array')
                  .catch((err) => {
                    reject(err);
                  })
                  .then((u8) => {
                    addFileFromArchive(zipFile.name, u8.buffer, u8.byteLength);
                    console.log(`${Date.now()} - end zip entry=${zipFile.name}, size=${u8.byteLength} ...`);
                  })
              );
            });
            Promise.all(promises)
              .then(() => {
                resolve('zip-archive-file-done');
              });
          });
      });
    }

    if (isTarArchive(f.name)) {
      toRemove.push(f);
      return new Promise((resolve, reject) => {
        const ext = extract();
        ext.on('entry', (header, stream, next) => {
          console.log(`${Date.now()} - start tar entry=${header.name}...`);
          const bytes = new ArrayBuffer(header.size);
          const content = new Uint8Array(bytes);
          let len = 0;
          stream.on('end', () => {
            if (header.size > 0 && header.type !== 'directory') {
              addFileFromArchive(header.name, bytes, header.size);
            }
            console.log(`${Date.now()} - end tar entry=${header.name}, size=${header.size} ...`);
            next(); // ready for next entry
          });

          stream.resume()
            .on('data', (d) => {
              content.set(d, len);
              len += d.byteLength;
            });
        });

        // all entries read
        ext.on('finish', () => {
          resolve('tar-archive-file-done');
        });

        ext.on('error', (err) => {
          reject(err);
        });


        // NOTE: raw content will be decompressed already, due to content-encoding being set to gzip
        // however in some cases/browsers depending on content-type the contents might NOT be decompressed
        gunzipIfNeeded(f.name, f.rawContent(), (err, buf) => {
          const s = new StrStream(buf);
          s.pipe(ext);
        });
      });
    }

    return Promise.reject(`unsupported archive file=${f.name}, likely a bug`);
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
}
