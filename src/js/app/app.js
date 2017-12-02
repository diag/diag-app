import {
  getAllSpaces, getSpace, getDatasets, getDataset, getFiles, postSpace, patchSpace, postDataset, patchDataset, getFileContent, uploadFile,
} from '../api/datasets';
import { getSpaceActivity, postSpaceActivity, postDatasetActivity, postFileActivity } from '../api/activity';
import { postAnnotation, getAllAnnotations, patchAnnotation, deleteAnnotation, postAnnotationComment, patchAnnotationComment, deleteAnnotationComment } from '../api/annotations';
import { TextEncoder, TextDecoder } from 'text-encoding';

import { Index } from 'diag-search/src/js/search';


import { extract } from 'tar-stream';
import { Readable } from 'stream';
import { gunzip } from 'zlib';
import JSZip from 'jszip';


/* global FileReader */
/* eslint no-multi-spaces: off */

function hackParent(hackArr, newParent) {
  hackArr.forEach(ha => ha._parent = newParent);
}

function simpleObjectReturn(payload, obj) {
  const ret = obj.copy();
  Object.assign(ret, payload.items[0]);
  return Promise.resolve(ret);
}

function checkEmpty(payload, callback) {
  if (payload.count > 0) {
    return callback();
  }
  return Promise.reject('Empty result set');
}

function props(orig) {
  return Object.keys(orig)
    .filter(key => !key.startsWith('_'))
    .filter(key => key !== 'id')
    .reduce((obj, key) => {
      obj[key] = orig[key];
      return obj;
    }, {});
}

function pushTo(arr, el) {
  arr = arr || [];
  arr.push(el);
  return arr;
}

function isTarArchive(name) {
  return name.endsWith('.tar') || name.endsWith('.tgz') || name.endsWith('.tar.gz');
}

function isZipArchive(name) {
  return name.toLowerCase().endsWith('.zip');
}

export function isArchiveFile(name) {
  return isTarArchive(name) || isZipArchive(name);
}

function isGzipFile(name) {
  return name.endsWith('.gz') || name.endsWith('.tgz');
}

function isGzipBuffer(buf) {
  if (!buf || buf.length < 3) {
    return false;
  }
  return buf[0] === 0x1F && buf[1] === 0x8B && buf[2] === 0x08;
}

function gunzipIfNeeded(name, buf, callback) {
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


/** Top level class representing all spaces we have access to */
export class Spaces {
  /**
   * Creates Spaces from data returned from API
   * @param {Space[]} spaces - Spaces we have access to
   */
  constructor(spaces) {
    this._spaces = spaces === undefined ? {} : spaces;
    this._currentSpaceId = undefined;
    this._currentDatasetId = undefined;
  }

  /**
   * Returns a copy of Spaces
   * @returns {Spaces}
   */
  copy() {
    const ret = new Spaces();
    ret._currentSpaceId = this._currentSpaceId;
    ret._currentDatasetId = this._currentDatasetId;
    ret._spaces = { ...this._spaces };
    return ret;
  }

  /**
   * All spaces
   * @returns {Space[]}
   */
  spaces()                   { return Object.values(this._spaces); }

  /**
   * Space to return
   * @param {string} sid - Space to return
   * @returns {Space}
   * */
  space(sid)                 { return this._spaces[sid] === undefined ? new Space() : this._spaces[sid]; }

  /**
   * Dataset to return
   * @param {string} sid - Space ID
   * @param {string} did - Dataset ID
   * @returns {Dataset}
   */
  dataset(sid, did)          { return this.space(sid).dataset(did); }

  /**
   * File to return
   * @param {string} sid - Space ID
   * @param {string} did - Dataset ID
   * @param {string} fid - File ID
   */
  file(sid, did, fid)        { return this.space(sid).dataset(did).file(fid); }

  /**
   * Spaces owned by a user
   * @param {string} owner - Owner
   * @returns {Space[]}
   */
  user(owner)                { return (this.spaces().filter(s => s.owner === owner) || []); }

  /**
   * Returns current space
   * @returns {Spaces}
   */
  currentSpace()             { return this._currentSpaceId === undefined ? new Space() : this.space(this._currentSpaceId); }

  /**
   * Returns current dataset
   * @returns {Dataset}
   */
  currentDataset()           { return (this._currentSpaceId === undefined || this._currentDatasetId === undefined) ? new Dataset() : this.dataset(this._currentSpaceId, this._currentDatasetId);  }

  /**
   * Returns current space ID
   * @returns {string}
   */
  currentSpaceId()           { return this._currentSpaceId; }

  /**
   * Returns current dataset ID
   * @returns {string}
   */
  currentDatasetId()         { return this._currentDatasetId; }

  /**
   * Load from API
   * @param {Promise<Space>} spacesPromise - Promise which returns a list of spaces
   * @returns {Promise<Spaces>}
  */
  static load(spacesPromise) {
    if (!spacesPromise) {
      spacesPromise = getAllSpaces();
    }
    return spacesPromise
      .then((payload) => {
        let ret = {};
        if (payload.count > 0) {
          ret = payload.items.map(s => new Space(s)).reduce((spaces, s) => { spaces[s.itemid()] = s; return spaces; }, {});
        }
        return new Promise((resolve) => { resolve(new Spaces(ret)); });
      });
  }

  /**
   * Inserts space into a copy of Spaces object
   * @param {Space} space
   * @returns {Spaces}
   */
  insert(space) {
    const ret = this.copy();
    ret._spaces = { ...this._spaces, [space.itemid()]: space };
    return ret;
  }

  /**
   * Replaces space in copy of Spaces object
   * @param {Space} space
   * @returns {Spaces}
   */
  update(space) {
    const ret = this.copy();
    ret._spaces = { ...this._spaces };
    ret._spaces[space.itemid()] = space;
    return ret;
  }

  /**
   * Inserts a dataset into a copy of Spaces object
   * @param {Dataset} dataset
   * @returns {Spaces}
   */
  insertDataset(dataset) {
    const spaceId = dataset.space().itemid();
    const newSpace = this.space(spaceId).insertDataset(dataset);
    return this.update(newSpace);
  }

  /**
   * Inserts activity into a copy of the Spaces object
   * @param {Activity} activity
   * @returns {Spaces}
   */
  insertActivity(activity) {
    const spaceId = activity.space().itemid();
    const newSpace = this.space(spaceId).insertActivity(activity);
    const dsId = activity.dataset().itemid();
    if (dsId !== undefined) {
      switch (activity.type) {
      case 'annotation':
        newSpace.dataset(dsId).annotation_count++;
        break;
      case 'upload':
        newSpace.dataset(dsId).file_count++;
        break;
      case 'search':
        newSpace.dataset(dsId).search_count++;
        break;
      default:
        break;
      }
    }
    return this.update(newSpace);
  }

  /**
   * Inserts a file into a copy of the Spaces object
   * @param {File} file
   * @returns {Spaces}
   */
  insertFile(file) {
    const spaceId = file.space().itemid();
    const datasetId = file.dataset().itemid();
    const newDataset = this.dataset(spaceId, datasetId).insertFile(file);
    const newSpace = this.space(spaceId).updateDataset(newDataset);
    return this.update(newSpace);
  }

  /**
   * Inserts an annotation into a copy of the Spaces object
   * @param {Annotation} annotation
   * @returns {Spaces}
   */
  insertAnnotation(annotation) {
    const spaceId = annotation.space().itemid();
    const datasetId = annotation.dataset().itemid();
    const newDataset = this.dataset(spaceId, datasetId).insertAnnotation(annotation);
    const newSpace = this.space(spaceId).updateDataset(newDataset);
    return this.update(newSpace);
  }

  /**
   * Update an annotation into a copy of the Spaces object
   * @param {Annotation} annotation
   * @returns {Spaces}
   */
  updateAnnotation(annotation) {
    const spaceId = annotation.space().itemid();
    const datasetId = annotation.dataset().itemid();
    const newDataset = this.dataset(spaceId, datasetId).updateAnnotation(annotation);
    const newSpace = this.space(spaceId).updateDataset(newDataset);
    return this.update(newSpace);
  }

  /**
   * Deletes an annotation from a copy of the Spaces object
   * @param {Annotation} annotation
   * @returns {Spaces}
   */
  deleteAnnotation(annotation) {
    const spaceId = annotation.space().itemid();
    const datasetId = annotation.dataset().itemid();
    const newDataset = this.dataset(spaceId, datasetId).deleteAnnotation(annotation);
    const newSpace = this.space(spaceId).updateDataset(newDataset);
    return this.update(newSpace);
  }

  /**
   * Updates a dataset into a copy of the Spaces object
   * @param {Dataset} dataset
   * @returns {Spaces}
   */
  updateDataset(dataset) {
    const spaceId = dataset.space().itemid();
    const newSpace = this.space(spaceId).updateDataset(dataset);
    return this.update(newSpace);
  }

  /**
   * Updates a file into a copy of the Spaces object
   * @param {File} file
   * @returns {Spaces}
   */
  updateFile(file) {
    const spaceId = file.space().itemid();
    const datasetId = file.dataset().itemid();
    const newDataset = this.dataset(spaceId, datasetId).updateFile(file);
    const newSpace = this.space(spaceId).updateDataset(newDataset);
    return this.update(newSpace);
  }

  /**
   * Sets current space to space
   * @param {(Space|number)} space - Can be space object or space ID
   */
  setCurrentSpace(space) {
    let currentSpaceId;
    if (space instanceof Space) {
      currentSpaceId = space.space().itemid();
    } else {
      currentSpaceId = space;
    }
    if (this.space(currentSpaceId).itemid() === undefined) {
      return Space.load(currentSpaceId)
        .then((payload) => {
          payload._currentSpaceId = currentSpaceId;
          return Promise.resolve(payload);
        });
    }
    const ret = this.copy();
    ret._currentSpaceId = currentSpaceId;
    ret._currentDatasetId = undefined;
    return new Promise(resolve => resolve(ret));
  }

  /**
   * Sets the current dataset to dataset
   * @param {(Dataset|number)} dataset - Can be dataset object or dataset ID
   */
  setCurrentDataset(dataset) {
    let currentDatasetId;
    let currentSpaceId;
    if (dataset instanceof Dataset) {
      currentDatasetId = dataset.itemid();
      currentSpaceId = dataset.space().itemid();
    } else {
      currentDatasetId = dataset;
      currentSpaceId = this._currentSpaceId;
    }
    if (this.dataset(currentSpaceId, currentDatasetId).itemid() === undefined) {
      if (this.space(currentSpaceId).itemid() === undefined) {
        return Promise.reject(`invalid current space ${currentSpaceId}`);
      }
      return Dataset.load(this.space(currentSpaceId), currentDatasetId)
        .then((payload) => {
          payload._currentSpaceId = currentSpaceId;
          payload._currentDatasetId = currentDatasetId;
          return Promise.resolve(payload);
        });
    }
    const ret = this.copy();
    ret._currentSpaceId = currentSpaceId;
    ret._currentDatasetId = currentDatasetId;
    return new Promise(resolve => resolve(ret));
  }
}

/** Space containing datasets and activity */
export class Space {
  /**
   * Create a space
   * @param {Object} space - Create new space with object from API
   */
  constructor(space) {
    Object.assign(this, space);
    this._datasets = {};
    this._activity = [];
  }

  /**
   * Shallow copy of this space
   * @returns {Space}
  */
  copy() {
    const ret = Object.assign({}, this, { _datasets: undefined, _activity: undefined });
    return new Space(ret);
  }

  /**
   * The Space ID as a string
   * @returns {string}
  */
  itemid()       { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * Returns the space name, defaulting to itemid if not set
   * @returns {string}
   */
  itemname()         { return this.name === undefined ? this.itemid() : this.name; }

  /**
   * This
   * @returns {Space}
   */
  space()        { return this; }

  /**
   * All datasets as an array
   * @returns {Dataset[]}
   */
  datasets()     { return Object.values(this._datasets); }

  /**
   * Particular dataset by a string dataset ID
   * @param {string} did - Dataset ID as a string
   * @returns {Dataset}
   */
  dataset(did)   { return this._datasets[did] === undefined ? new Dataset() : this._datasets[did]; }

  /**
   * Particular file by a string datasetID & string file ID
   * @param {string} did
   * @param {string} fid
   * @returns {File}
   */
  file(did, fid) { return this.dataset(did).file(fid); }

  /**
   * All activity for this space
   * @returns {Activity[]}
   */
  activity()     { return this._activity; }

  /**
   * Returns URL for this space
   * @returns {string}
   */
  url()          { return Space.url(this.id); }

  /**
   * Returns URL for the space given a space id
   * @returns {string}
   */
  static url(sid) { return sid === undefined || sid.item_id === undefined ? undefined : `/space/${sid.item_id}`; }

  /**
   * Returns non-private space properties in a shallow object copy
   * @returns {object}
   */
  props()        { return props(this); }

  /**
   * Fetch spaces from the API
   * @returns {Promise<Space>}
   */
  load(datasetPromise) {
    if (!datasetPromise) {
      datasetPromise = getDatasets(this.itemid());
    }
    const ret = this.copy();
    return Promise.all([
      datasetPromise
        .then(payload => (
          checkEmpty(payload, () => (
            payload.items.map(i => new Dataset(ret, i)).reduce((datasets, d) => { datasets[d.itemid()] = d; return datasets; }, {})
          ))
        )),
      getSpaceActivity(this.itemid())
        .then(payload => (
          payload.items.map(i => new Activity(ret, i))
        )),
    ]).then((promises) => {
      ret._datasets = promises[0];
      ret._activity = promises[1];
      return new Promise((resolve) => { resolve(ret); });
    });
  }

  /**
   * Fetches a space from the API by id
   * @param {string} spaceId - ID of the space to retrieve from the API
   * @returns {Promise<dataset>}
   */
  static load(spaceId) {
    return Spaces.load(getSpace(spaceId));
  }

  /**
   * Saves space to the API
   * @param {string} id - Space ID to create
   * @param {string} name - Space name
   * @returns {Promise<Space>}
   */
  static create(id, name) {
    if (id === undefined) {
      return Promise.reject('id undefined');
    }
    return postSpace(id, name)
      .then((payload) => {
        if (payload.count > 0) {
          return new Promise(resolve => resolve(new Space(payload.items[0])));
        }
        return Promise.reject('Empty result set');
      });
  }
  /**
   * Update space in the API
   * @returns {Promise<Space>}
   */
  update() {
    return patchSpace(this.itemid(), this.name)
      .then((payload) => {
        if (payload.count > 0) {
          // HACK shouldn't mutate existing state, but this saves us from having to reload the whole dataset from the server
          const ret = this.copy();
          Object.assign(ret, payload.items[0]);
          ret._datasets = [...this._datasets];
          ret.datasets().forEach(ds => ds._parent = ret);
          ret._activity = [...this._activity];
          ret.activity().forEach(a => a._parent = ret);
          return Promise.resolve(ret);
        }
      });
  }
  /**
   * Inserts dataset into copy of the space
   * @param {Dataset} dataset
   * @returns {Space}
   */
  insertDataset(dataset) {
    const ret = this.copy();
    ret._datasets = { ...this._datasets, [dataset.itemid()]: dataset };
    ret._activity = this._activity; // Not mutating activity, return original
    return ret;
  }
  /**
   * Inserts activity into copy of the space
   * @param {Activity} activity
   */
  insertActivity(activity) {
    const ret = this.copy();
    ret._datasets = this._datasets; // Not mutating datasets, return original
    // HACK not supposed to mutate state, but quick fix
    ret.datasets().forEach(d => d._parent = ret);
    ret._activity = [...this._activity, activity];
    return ret;
  }
  /**
   * Updates dataset in a copy of the space
   * @param {Dataset} dataset
   * @returns {Space}
   */
  updateDataset(dataset) {
    const ret = this.copy();
    ret._datasets = { ...this._datasets };
    ret._activity = this._activity;
    ret._datasets[dataset.itemid()] = dataset;
    return ret;
  }
}

class StrStream extends Readable {
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

/** Dataset containing files and activity */
export class Dataset {
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
  }

  /**
   * Shallow copy of this dataset
   * @returns {Dataset}
  */
  copy()         {
    // console.log('dataset copy: ' + (new Error()).stack)
    const ret = Object.assign({}, this, { _files: undefined, _annotations: undefined });
    return new Dataset(this._parent, ret);
  }

  /**
   * Dataset ID as a string
   * @returns {string}
  */
  itemid()       { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * The parent Space
   * @returns {Space}
   */
  space()        { return this._parent; }

  /**
   * This
   * @returns {Dataset}
   */
  dataset()      { return this; }

  /**
   * Particular file by file ID
   * @param {string} fid - File ID
   * @returns {File}
  */
  file(fid)      { return this._files[fid]; }

  /**
   * All files
   * @returns {File[]}
   */
  files()        { return Object.values(this._files); }

  /**
   * Activity
   * @returns {Activity[]}
   */
  activity()     { return this.space().activity().filter(a => a.id.dataset_id === this.itemid()); }

  /**
   * Annotations
   * @param {string} [fid] - File ID (optional)
   * @returns {Annotations[]}
   */
  annotations(fid)  { return fid === undefined ? Object.values(this._annotations).reduce((a, b) => a.concat(b), []) : this._annotations[fid]; }

  /**
   * Returns URL for this file
   * @returns {string}
   */
  url()          { return Dataset.url(this.id); }


  /**
   * Returns URL for the dataset given a dataset id
   * @returns {string}
   */
  static url(did) { return did === undefined || did.space_id === undefined || did.item_id === undefined ? undefined : `/dataset/${did.space_id}/${did.item_id}`; }

  /**
   * Returns non-private dataset properties in a shallow object copy
   * @returns {object}
   */
  props()        { return props(this); }

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

/** File uploaded to API with activity and annotations */
export class File {
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
  copy()         { return new File(this._parent, this); }

  /**
   * File ID as a string
   * @returns {string}
  */
  itemid()       { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * The parent Space
   * @returns {Space}
   */
  space()        { return this.dataset().space(); }

  /**
   * The parent Dataset
   * @returns {Dataset}
   */
  dataset()      { return this._parent; }

  /**
   * Activity
   * @returns {Activity[]}
   */
  activity()     { return this.space().activity().filter(a => a.id.file_id === this.itemid()); }

  /**
   * Annotations
   * @returns {Annotations[]}
   */
  annotations()  { return (this.dataset().annotations(this.itemid()) || []); }

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
  url()          { return File.url(this.id); }

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
  props()        { return props(this); }

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
                    gunzipIfNeeded(f.name,  fr.result, (err, buf) => {
                      f.setRawContent(buf);
                      res();
                    });
                  });

                  // at this point f.getRawContent() will contain uncompressed data (might still be archived tho)
                  return p.then(() => {
                    if (!isArchiveFile(f.name)) {
                      dataset.addFileToIndex(f);   // simple file
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

/** User activity */
export class Activity {
  /**
   * Create activity
   * @param {Space} parent - Parent
   * @param {Object} activity - Activity object from API
   */
  constructor(parent, activity) {
    Object.assign(this, activity);
    this._parent = parent;
  }

  /**
   * Shallow copy of this file
   * @returns {File}
  */
  copy()         { return new Activity(this._parent, this); }

  /**
   * Activity ID as a string
   * @returns {string}
  */
  itemid()       { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * The parent Space
   * @returns {Space}
   */
  space()        { return this._parent.space(); }

  /**
   * The parent Dataset, if it exists for this activity. Can return undefined.
   * @returns {Dataset}
   */
  dataset() {
    if ('dataset_id' in this.id) {
      return this._parent.dataset(this.id.dataset_id);
    }
    return undefined;
  }

  /**
   * The parent file, if it exists for this activity. Can return undefined.
   * @returns {File}
   */
  file() {
    if ('file_id' in this.id && 'dataset_id' in this.id) {
      return this.space().dataset(this.id.dataset_id).file(this.id.file_id);
    }
    return undefined;
  }

  // TODO DG-101 This should be able to link back to an annotation
  // In the interim, we've leaked backend details into ActivityPanel.js
  // which will need to be cleaned up.
  static annotation() {
    return undefined;
  }

  /**
   * Returns non-private activity properties in a shallow object copy
   * @returns {object}
   */
  props()        { return props(this); }

  /**
   * Saves new activity to the API
   * @param {(Space|Dataset|File)} parent - Parent object, can be Space, Dataset or File
   * @param {string} type - Type, search|upload|annotation for now
   * @param {Object} data - Full data of the activity. Should contain at minimum the ID object of what the activity references.
   */
  static create(parent, type, data) {
    if (parent === undefined) {
      return Promise.reject('parent undefined');
    }
    if (!(parent instanceof Space || parent instanceof Dataset || parent instanceof File)) {
      return Promise.reject('parent is not a Space, Dataset or File');
    }
    if (type === undefined) {
      return Promise.reject('type undefined');
    }
    if (data === undefined) {
      return Promise.reject('data undefined');
    }
    if (typeof data !== 'object') {
      return Promise.reject('data is not an object');
    }
    if (!('id' in data)) {
      return Promise.reject('data does not contain id object');
    }
    if (!('item_id' in data.id)) {
      return Promise.reject('data.id is not ID object');
    }
    let ret;
    if (parent instanceof Space) {
      ret = postSpaceActivity(parent.itemid(), type, data);
    } else if (parent instanceof Dataset) {
      ret = postDatasetActivity(parent.space().itemid(), parent.itemid(), type, data);
    } else if (parent instanceof File) {
      ret = postFileActivity(parent.space().itemid(), parent.dataset().itemid(), parent.itemid(), type, data);
    }
    return ret
      .then(payload => (
        checkEmpty(payload, () => (
          new Promise(resolve => resolve(new Activity(parent, payload.items[0])))
        ))
      ));
  }
}

/** Annotations on files */
export class Annotation {
  /**
   * Creates a annotation
   * @param {File} parent - File object pointing to parent
   * @param {Object} annotation - Annotation object returned from API
   */
  constructor(parent, annotation) {
    Object.assign(this, annotation);
    this._parent = parent;
  }

  /**
   * Shallow copy of this annotation
   * @returns {Annotation}
  */
  copy()         { return new Annotation(this._parent, this); }

  /**
   * Annotation ID as a string
   * @returns {string}
  */
  itemid()       { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * The parent Space
   * @returns {Space}
   */
  space()        { return this.dataset().space(); }

  /**
   * The parent Dataset
   * @returns {Dataset}
   */
  dataset()      { return this.file().dataset(); }

  /**
   * The parent File
   * @returns {File}
   */
  file()         { return this._parent; }

  /**
   * Returns non-private annotation properties in a shallow object copy
   * @returns {object}
   */
  props()        { return props(this); }

  // No load as we'll do loading from the dataset

  /**
   * Saves a Annotation to the API
   * @param {File} file - Parent file object
   * @param {string} description - Description of the annotation
   * @param {number} offset - Offset from the beginning of the file
   * @param {number} length - Length of the annotation
   * @param {string} [data] - Data pointed to by the annotation
   */
  static create(file, description, offset, length, data) {
    if (file === undefined) {
      return Promise.reject('file undefined');
    }
    if (!(file instanceof File)) {
      return Promise.reject('file is not File object');
    }
    if (description === undefined) {
      return Promise.reject('description undefined');
    }
    if (offset === undefined) {
      return Promise.reject('offset undefined');
    }
    if (length === undefined) {
      return Promise.reject('length undefined');
    }
    return postAnnotation(file.space().itemid(), file.dataset().itemid(), file.itemid(), offset, length, description, data)
      .then(payload => (
        checkEmpty(payload, () => new Promise(resolve => resolve(new Annotation(file, payload.items[0]))))
      ));
  }

  /**
   * Updates an annotation in the API
   * @returns {Promise<Annotation>}
   */
  update() {
    if (this.description === undefined) {
      return Promise.reject('description undefined');
    }
    return patchAnnotation(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid(), this.description)
      .then((payload) => {
        if (payload.count > 0) {
          const ret = this.copy();
          Object.assign(ret, payload.items[0]);
          return Promise.resolve(ret);
        }
        return Promise.reject('Empty result set');
      });
  }

  /**
   * Deletes an annotation in the API
   * @returns {Promise<Annotation>}
   */
  delete() {
    return deleteAnnotation(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid())
      .then(() => {
        return Promise.resolve(this);
      });
  }

  /**
   * Adds a comment in the API
   */
  createComment(text) {
    if (text === undefined || text.length === 0) {
      return Promise.reject('text must be defined');
    }
    return postAnnotationComment(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid(), text)
      .then((payload) => (
        checkEmpty(payload, () => simpleObjectReturn(payload, this))
      ));
  }

  /**
   * Adds a comment in the API
   */
  updateComment(id, text) {
    if (id === undefined || id.length === 0) {
      return Promise.reject('id must be defined');
    }
    if (text === undefined || text.length === 0) {
      return Promise.reject('text must be defined');
    }
    return patchAnnotationComment(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid(), id, text)
      .then((payload) => (
        checkEmpty(payload, () => simpleObjectReturn(payload, this))
      ));
  }

  /**
   * Deletes a comment in the API
   */
  deleteComment(id) {
    if (id === undefined || id.length === 0) {
      return Promise.reject('id must be defined');
    }
    return deleteAnnotationComment(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid(), id)
      .then((payload) => (
        simpleObjectReturn(payload, this)
      ));
  }
}
