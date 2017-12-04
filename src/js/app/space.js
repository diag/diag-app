import {
  getSpace, getDatasets, postSpace, patchSpace,
} from '../api/datasets';
import Spaces from './spaces';
import Dataset from './dataset';
import { props, checkEmpty } from '../utils/apputils';

/** Space containing datasets and activity */
export default class Space {
  /**
   * Create a space
   * @param {Object} space - Create new space with object from API
   */
  constructor(space) {
    Object.assign(this, space);
    this._datasets = {};
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
  itemid() { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * Returns the space name, defaulting to itemid if not set
   * @returns {string}
   */
  itemname() { return this.name === undefined ? this.itemid() : this.name; }

  /**
   * This
   * @returns {Space}
   */
  space() { return this; }

  /**
   * All datasets as an array
   * @returns {Dataset[]}
   */
  datasets() { return Object.values(this._datasets); }

  /**
   * Particular dataset by a string dataset ID
   * @param {string} did - Dataset ID as a string
   * @returns {Dataset}
   */
  dataset(did) { return this._datasets[did] === undefined ? new Dataset() : this._datasets[did]; }

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
  activity() { return Spaces.store().activity(this.id); }

  /**
   * Returns URL for this space
   * @returns {string}
   */
  url() { return Space.url(this.id); }

  /**
   * Returns URL for the space given a space id
   * @returns {string}
   */
  static url(sid) { return sid === undefined || sid.item_id === undefined ? undefined : `/space/${sid.item_id}`; }

  /**
   * Returns non-private space properties in a shallow object copy
   * @returns {object}
   */
  props() { return props(this); }

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
    ]).then((promises) => {
      ret._datasets = promises[0];
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
   * @param {function} store - Function which returns the store
   * @returns {Promise<Space>}
   */
  static create(id, name, store) {
    if (id === undefined) {
      return Promise.reject('id undefined');
    }
    return postSpace(id, name)
      .then((payload) => {
        if (payload.count > 0) {
          return Promise.resolve(new Space(payload.items[0], store));
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
