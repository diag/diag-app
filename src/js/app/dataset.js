import { getDataset, postDataset, patchDataset } from '../api/datasets';
import { props, isArchiveFile, pushTo, hackParent } from '../utils/apputils';
import { Index } from 'diag-search/src/js/search';
import Spaces from './spaces';
import Space from './space';

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
  file(fid) { return Spaces.store().file(this.space().itemid(), this.itemid(), fid); }

  /**
   * All files
   * @returns {File[]}
   */
  files() { return Spaces.store().files(this.id); }

  /**
   * Activity
   * @returns {Activity[]}
   */
  activity() { return Spaces.store().activity(this.id); }

  /**
   * Annotations
   * @param {string} [fid] - File ID (optional)
   * @returns {Annotations[]}
   */
  annotations(fid) {
    let id;
    if (fid) {
      id = { space_id: this.space().itemid(), dataset_id: this.dataset().itemid(), item_id: fid };
    } else {
      id = this.id;
    }
    return Spaces.store().annotations(id);
  }

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
   * Indexes files currently loaded in the dataset
   */
  index() {
    const ret = this.copy();
    const startTime = Date.now();
    console.log(`${startTime} - index start`);
    ret._initIndex();
    // index the files
    ret.resetIndex(); // reset index in case we're reloading
    ret.files().forEach((f) => {
      ret.addFileToIndex(f);
    });
    const endTime = Date.now();
    console.log(`${endTime} - index done in ${endTime - startTime} ms`);
    return Promise.resolve(ret);
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
