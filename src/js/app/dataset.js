import { getDataset, getDatasets, postDataset, patchDataset, deleteDataset, patchDatasetNew } from '../api/datasets';
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


  static _newDataset(payload){
    if (payload.count > 0) {
      return Promise.resolve(new Dataset(payload.items[0]));
    }
    return Promise.reject('Empty result set');
  }

  static _id(datasetOrId) {
    if (datasetOrId === undefined) {
      return new Error('datasetOrId undefined');
    }
    if (!(datasetOrId instanceof Dataset)) {
      const id = new AssetId(datasetOrId);
      if (!(datasetOrId instanceof Dataset) && (id.valid && !id.valid())) {
        return new Error('datasetOrId is not a valid Dataset object or valid AssetId');
      }
      return id;
    } else {
      return datasetOrId.id;
    }
  }


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
   * @param {object} [custom] - set of custom fields (optional)
   * @returns {Promise<Dataset>}
   */
  static create(space, name, description, tags, problem, resolution, custom) {
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
    return postDataset(id, name, description, tags, problem, resolution, custom)
      .then(Dataset._newDataset);
  }
  /**
   * Updates dataset with the API
   * @returns {Promise<Dataset>}
   */
  update() {
    // update dataset itself
    return patchDataset(this.id.space_id, this.id.item_id, this.name, this.description, this.tags, this.problem, this.resolution, this.custom)
      .then(Dataset._newDataset);
  }

  /**
   * Deletes a dataset with the API
   * @param {(Dataset|string)} datasetOrId - Dataset or AssetId representing a dataset
   * @returns {Promise<Dataset>}
   */
  static delete(datasetOrId) {
    const id = Dataset._id(datasetOrId);
    if (id instanceof Error) {
      return Promise.reject(id.message);
    }
    return deleteDataset(id.space_id, id.item_id)
      .then(Dataset._newDataset);
  }

  static patch(datasetOrId, fields2change) {
    const id = Dataset._id(datasetOrId);
    if (id instanceof Error) {
      return Promise.reject(id.message);
    }
    return patchDatasetNew(id.space_id, id.item_id, fields2change)
      .then(Dataset._newDataset);
  }

  /**
   * Deletes this dataset with the api
   * @returns {Promise<Dataset>}
   */
  delete() {
    return Dataset.delete(this);
  }
}
