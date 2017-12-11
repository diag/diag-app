import { getDataset, getDatasets, postDataset, patchDataset } from '../api/datasets';
import { Index } from 'diag-search';
import Spaces from './spaces';
import Space from './space';
import Base from './base';

/** Dataset containing files and activity */
export default class Dataset extends Base {
  /**
   * Create a dataset
   * @param {Object} dataset - Dataset returned from the backend
   */
  constructor(dataset) {
    super(Spaces.store);
    Object.assign(this, dataset);
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
   * @param {(string)} datasetId - ID of the dataset to retrieve from the API (optional)
   * @returns {Promise<dataset>}
   */
  static load(spaceId, datasetId) {
    let dsPromise;
    if (datasetId === undefined) {
      dsPromise = getDatasets(spaceId);
    } else {
      dsPromise = getDataset(spaceId, datasetId);
    }
    return dsPromise
      .then(payload => (
        payload.items.map(i => new Dataset(i))
      ));
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
          return new Promise(resolve => resolve(new Dataset(payload.items[0])));
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
}
