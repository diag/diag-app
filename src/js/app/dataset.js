import { getDataset, getDatasets, postDataset, patchDataset, deleteDataset } from '../api/datasets';
import { AssetId } from '../utils';
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
    Object.assign(this, dataset, { _store: Spaces.store });
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
   * @param {(Space|string)} spaceOrSpaceId - Space object of parent or space ID
   * @param {string} name - Name of dataset
   * @param {string} [description] - Description of dataset (optional)
   * @param {string[]} [tags] - Tags describing dataset
   * @param {string} [problem] - Description of the problem (optional)
   * @param {string} [resolution] - Description of the resolution (optional)
   * @returns {Promise<Dataset>}
   */
  static create(space, name, description, tags, problem, resolution) {
    let id;
    if (space === undefined) {
      return Promise.reject('space undefined');
    }
    if (!(space instanceof Space)) {
      id = space;
      if (typeof id !== 'string') {
        return Promise.reject('space is not Space object or a space ID');
      }
    } else {
      id = space.id.item_id;
    }
    if (name === undefined) {
      return Promise.reject('name undefined');
    }
    if (!Array.isArray(tags) && tags !== undefined) {
      return Promise.reject('tags is not an array');
    }
    return postDataset(id, name, description, tags, problem, resolution)
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
    return patchDataset(this.id.space_id, this.id.item_id, this.name, this.description, this.tags, this.problem, this.resolution)
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
   * Deletes a dataset with the API
   * @param {(Dataset|string)} datasetOrId - Dataset or AssetId representing a dataset
   * @returns {Promise<Dataset>}
   */
  static delete(datasetOrId) {
    let id;
    if (datasetOrId === undefined) {
      return Promise.reject('datasetOrId undefined');
    }
    if (!(datasetOrId instanceof Dataset)) {
      id = new AssetId(datasetOrId);
      if (!id.valid() && !(datasetOrId instanceof Dataset)) {
        return Promise.reject('datasetOrId is not a valid Dataset object or valid AssetId');
      }
    } else {
      id = datasetOrId.id;
    }
    return deleteDataset(id.space_id, id.item_id)
      .then((payload) => {
        if (payload.count > 0) {
          const ret = new Dataset(payload.items[0]);
          return Promise.resolve(ret);
        }
        return Promise.reject('Empty result set');
      });
  }

  /**
   * Deletes this dataset with the api
   * @returns {Promise<Dataset>}
   */
  delete() {
    return Dataset.delete(this);
  }
}
