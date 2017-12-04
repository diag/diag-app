import { getFiles, getDataset, postDataset, patchDataset } from '../api/datasets';
import { getAllAnnotations } from '../api/annotations';
import { props, isArchiveFile, isZipArchive, isTarArchive, gunzipIfNeeded, StrStream, pushTo, hackParent } from '../utils/apputils';
import JSZip from 'jszip';
import { extract } from 'tar-stream';
import { Index } from 'diag-search/src/js/search';
import Spaces from './spaces';
import Space from './space';
import File from './file';
import Annotation from './annotation';

/** Dataset containing files and activity */
export default class Dataset {
  /**
   * Create a dataset
   * @param {Space} parent - Space object pointing to the parent of this dataset
   * @param {Object} dataset - Dataset returned from the backend
   */
  constructor(parent, dataset) {
    Object.assign(this, dataset);
    this._files = {};
    this._annotations = {};
    this._parent = parent;
    this._store = (parent || {})._store;
  }

  /**
   * Shallow copy of this dataset
   * @returns {Dataset}
  */
  copy() {
    // console.log('dataset copy: ' + (new Error()).stack)
    const ret = Object.assign({}, this, { _files: undefined, _annotations: undefined });
    return new Dataset(this._parent, ret);
  }

  /**
   * Dataset ID as a string
   * @returns {string}
  */
  itemid() { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * The parent Space
   * @returns {Space}
   */
  space() { return this._parent; }

  /**
   * This
   * @returns {Dataset}
   */
  dataset() { return this; }

  /**
   * Particular file by file ID
   * @param {string} fid - File ID
   * @returns {File}
  */
  file(fid) { return this._files[fid]; }

  /**
   * All files
   * @returns {File[]}
   */
  files() { return Object.values(this._files); }

  /**
   * Activity
   * @returns {Activity[]}
   */
  activity() { return this._store().activity(this.id); }

  /**
   * Annotations
   * @param {string} [fid] - File ID (optional)
   * @returns {Annotations[]}
   */
  annotations(fid) { return fid === undefined ? Object.values(this._annotations).reduce((a, b) => a.concat(b), []) : this._annotations[fid]; }

  /**
   * Returns URL for this file
   * @returns {string}
   */
  url() { return Dataset.url(this.id); }


  /**
   * Returns URL for the dataset given a dataset id
   * @returns {string}
   */
  static url(did) { return did === undefined || did.space_id === undefined || did.item_id === undefined ? undefined : `/dataset/${did.space_id}/${did.item_id}`; }

  /**
   * Returns non-private dataset properties in a shallow object copy
   * @returns {object}
   */
  props() { return props(this); }

  _initIndex() {
    if (this._index) {
      return;
    }
    this._index = new Index();
  }

  static addFileToIndex(index, f, breaker) {
    breaker = breaker || (f.parse || {}).breaker || '\n';
    const tokenizer = /[^a-zA-Z0-9_]+/;

    let skip = false;
    ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.pyc', '.pyo', '.tar', '.tgz', '.gz']
      .forEach((ext) => {
        skip |= f.name.endsWith(ext);
      });

    // TODO: index only files that look like text ...
    if (!skip) {
      index = index || new Index();
      index.add(f.itemid(), f.content(), new RegExp(breaker, 'g'), tokenizer);
    }
    return index;
  }

  resetIndex() {
    delete this._index;
  }

  addFileToIndex(f) {
    this._index = Dataset.addFileToIndex(this._index, f);
  }

  removeFileFromIndex(f) {
    if (this._index) {
      this._index.removeBySource(f.itemid());
    }
  }

  /* eslint prefer-template: off */
  /* eslint class-methods-use-this: off */
  _expandArchive(f, toAdd, toRemove) {
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

  _updateFiles(toAdd, toRemove) {
    // remove/add files
    for (let i = 0; i < toAdd.length; ++i) {
      this._files[toAdd[i].itemid()] = toAdd[i];
      this.file_count++;
    }
    for (let i = 0; i < toRemove.length; ++i) {
      if (this._files[toRemove[i].itemid()]) {
        delete this._files[toRemove[i].itemid()];
        this.file_count--;
      }
    }
  }

  /**
   * Fetch a dataset from the API
   * @returns {Promise<Dataset>}
   */
  load() {
    const ret = this.copy();
    return Promise.all([
      getFiles(this.space().itemid(), this.itemid())
        .then(payload => (
          payload.items.map(f => new File(ret, f)).reduce((files, f) => {
            // see if we can reuse the content from the current file
            // TODO: consider potential cache size bloat
            const cf = this.file(f.itemid());
            if (cf) {
              f.setRawContent(cf.rawContent());
            }
            files[f.itemid()] = f;
            return files;
          }, {})
        )),
      getAllAnnotations(this.space().itemid(), this.itemid())
        .then(payload => (
          payload.items
        )),
    ]).then((promises) => {
      ret._files = promises[0];
      ret._annotations = promises[1];
    }).then(() => {
      // download and index files in the DS
      // TODO; move this to a bg task
      const startTime = Date.now();
      console.log(`${startTime} - download & index start`);
      const downloads = [];
      ret._initIndex();

      const filesToAdd = [];
      const filesToRemove = [];
      ret.files().forEach((f) => {
        downloads.push(
          f.load()
            .then((newf) => {
              console.log(`${Date.now()} - downloaded file=${f.name}`);
              f.setRawContent(newf.rawContent()); // copy content from newF
              return this._expandArchive(newf, filesToAdd, filesToRemove);
            }).catch((err) => {
              console.error(`Failed to load contents of dataset=${ret.name}, file=${f.name}, err=${err}`);
            })
        );
      });

      return Promise.all(downloads)
        .then(() => {
          // remove/add files
          ret._updateFiles(filesToAdd, filesToRemove);

          // resolve annotations
          ret._annotations = ret._annotations.map((a) => {
            const f = ret.file(a.id.file_id);
            if (f === undefined) {
              console.warn(`File id ${a.id.file_id} not in dataset id ${ret.itemid()}`);
              return undefined;
            }
            return new Annotation(f, a);
          })
            .filter(a => a !== undefined)
            .reduce((annotations, a) => {
              const fa = annotations[a.file().itemid()];
              annotations[a.file().itemid()] = pushTo(fa, a);
              return annotations;
            }, {});

          // index the files
          ret.resetIndex(); // reset index in case we're reloading
          ret.files().forEach((f) => {
            ret.addFileToIndex(f);
          });
        })
        .then(() => {
          const endTime = Date.now();
          console.log(`${endTime} - download & index done in ${endTime - startTime} ms`);
        })
        .then(() => (Promise.resolve(ret)));
    }).catch((err) => {
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

  /**
   * Fetches a dataset from the API by id
   * @param {Space} space - Space to load dataset into
   * @param {string} datasetId - ID of the dataset to retrieve from the API
   * @returns {Promise<dataset>}
   */
  static load(space, datasetId) {
    return space.load(getDataset(space.itemid(), datasetId))
      .then((s) => {
        return Promise.resolve(new Spaces({ [s.itemid()]: s }));
      });
  }
  /**
   * Saves dataset to the API
   * @param {Space} space - Space object of parent
   * @param {string} name - Name of dataset
   * @param {string} [description] - Description of dataset (optional)
   * @param {string[]} [tags] - Tags describing dataset
   * @param {string} [problem] - Description of the problem (optional)
   * @param {string} [resolution] - Description of the resolution (optional)
   * @returns {Promise<Dataset>}
   */
  static create(space, name, description, tags, problem, resolution) {
    if (space === undefined) {
      return Promise.reject('space undefined');
    }
    if (!(space instanceof Space)) {
      return Promise.reject('space is not Space object');
    }
    if (name === undefined) {
      return Promise.reject('name undefined');
    }
    if (!Array.isArray(tags) && tags !== undefined) {
      return Promise.reject('tags is not an array');
    }
    return postDataset(space.itemid(), name, description, tags, problem, resolution)
      .then((payload) => {
        if (payload.count > 0) {
          return new Promise(resolve => resolve(new Dataset(space, payload.items[0])));
        }
        return Promise.reject('Empty result set');
      });
  }
  /**
   * Updates dataset with the API
   * @returns {Promise<Dataset>}
   */
  update() {
    // update dataset itself
    return patchDataset(this.space().itemid(), this.itemid(), this.name, this.description, this.tags, this.problem, this.resolution)
      .then((payload) => {
        if (payload.count > 0) {
          // HACK shouldn't mutate existing state, but this saves us from having to reload the whole dataset from the server
          const ret = this.copy();
          Object.assign(ret, payload.items[0]);
          ret._files = this._files;
          ret.files().forEach(f => f._parent = ret);
          ret._annotations = { ...this._annotations };
          return Promise.resolve(ret);
        }
        return Promise.reject('Empty result set');
      });
  }
  /**
   * Inserts file into copy of the dataset
   * @param {File} file
   * @returns {Dataset}
   */
  insertFile(file) {
    if (isArchiveFile(file.name)) { // don't insert archive files, they've been already expanded
      return this;
    }
    const ret = this.copy();
    ret._files = { ...this._files, [file.itemid()]: file };
    ret._annotations = this._annotations; // Not mutating annotations, return original
    return ret;
  }
  /**
   * Inserts annotation into copy of the dataset
   * @param {Annotation} annotation
   * @returns {Dataset}
   */
  insertAnnotation(annotation) {
    const ret = this.copy();
    ret._files = this._files;
    // HACK Not supposed to mutate existing datastructures, but need to update file parent
    ret.files().forEach(f => f._parent = ret);
    ret._annotations = { ...this._annotations };
    const fa = ret._annotations[annotation.file().itemid()];
    ret._annotations[annotation.file().itemid()] = pushTo(fa, annotation);
    return ret;
  }
  /**
   * Updates an annotation in a copy of the dataset
   * @param {Annotation} annotation
   * @returns {Dataset}
   */
  updateAnnotation(annotation) {
    const ret = this.copy();
    ret._files = this._files;
    // HACK Not supposed to mutate existing datastructures, but need to update file parent
    hackParent(ret.files(), ret);
    ret._annotations = { ...this._annotations };
    const fa = (ret._annotations[annotation.file().itemid()] || []).filter(a => a.itemid() !== annotation.itemid());
    ret._annotations[annotation.file().itemid()] = pushTo(fa, annotation);
    return ret;
  }
  /**
   * Deletes an annotation in a copy of the dataset
   * @param {Annotation} annotation
   * @returns {Dataset}
   */
  deleteAnnotation(annotation) {
    const ret = this.copy();
    ret._files = this._files;
    // HACK Not supposed to mutate existing datastructures, but need to update file parent
    hackParent(ret.files(), ret);
    ret._annotations = { ...this._annotations };
    const fa = (ret._annotations[annotation.file().itemid()] || []).filter(a => a.itemid() !== annotation.itemid());
    ret._annotations[annotation.file().itemid()] = fa;
    return ret;
  }
  /**
   * Inserts file into copy of the dataset
   * @param {File} file
   * @returns {Dataset}
   */
  updateFile(file) {
    const ret = this.copy();
    ret._files = { ...this._files };
    ret._files[file.itemid()] = file;
    ret._annotations = this._annotations; // Not mutating annotations, return original
    return ret;
  }
}
