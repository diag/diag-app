import { getAllSpaces } from '../api/datasets';
import { dispatchError } from '../utils/uiutils';
import Space from './space';
import Dataset from './dataset';

/** Top level class representing all spaces we have access to */
export default class Spaces {
  /**
   * Creates Spaces from data returned from API
   * @param {Space[]} spaces - Spaces we have access to
   * @param {function} dispatch - Redux dispatch function
   * @param {function} getStore - Redux getStore function
   */
  constructor(spaces, dispatch, getStore) {
    this._dispatch = dispatch;
    this._getStore = getStore;
    this._store = () => this._getStore().spaces;
    this._spaces = spaces === undefined ? {} : spaces;
    Object.keys(this._spaces).forEach(key => this._spaces[key]._store = this._store);
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
    ret._dispatch = this._dispatch;
    ret._getStore = this._getStore;
    ret._store = () => this._getStore().spaces;
    Object.keys(ret._spaces).forEach(key => ret._spaces[key]._store = ret._store);
    return ret;
  }

  /**
   * All spaces
   * @returns {Space[]}
   */
  spaces() { return Object.values(this._spaces); }

  /**
   * Space to return
   * @param {string} sid - Space to return
   * @returns {Space}
   * */
  space(sid) { return this._spaces[sid] === undefined ? new Space() : this._spaces[sid]; }

  /**
   * Dataset to return
   * @param {string} sid - Space ID
   * @param {string} did - Dataset ID
   * @returns {Dataset}
   */
  dataset(sid, did) { return this.space(sid).dataset(did); }

  /**
   * File to return
   * @param {string} sid - Space ID
   * @param {string} did - Dataset ID
   * @param {string} fid - File ID
   */
  file(sid, did, fid) { return this.space(sid).dataset(did).file(fid); }

  /**
   * Spaces owned by a user
   * @param {string} owner - Owner
   * @returns {Space[]}
   */
  user(owner) { return (this.spaces().filter(s => s.owner === owner) || []); }

  /**
   * Returns current space
   * @returns {Spaces}
   */
  currentSpace() { return this._currentSpaceId === undefined ? new Space() : this.space(this._currentSpaceId); }

  /**
   * Returns current dataset
   * @returns {Dataset}
   */
  currentDataset() { return (this._currentSpaceId === undefined || this._currentDatasetId === undefined) ? new Dataset() : this.dataset(this._currentSpaceId, this._currentDatasetId); }

  /**
   * Returns current space ID
   * @returns {string}
   */
  currentSpaceId() { return this._currentSpaceId; }

  /**
   * Returns current dataset ID
   * @returns {string}
   */
  currentDatasetId() { return this._currentDatasetId; }

  activity(id) { return this._activityList ? this._activityList(id) : []; }

  /**
   * Load from API
   * @param {Promise<Space>} spacesPromise - Promise which returns a list of spaces
   * @param {function} dispatch - Dispatch function for redux
   * @param {function} getStore - Store function for redux
   * @returns {Promise<Spaces>}
  */
  static load(spacesPromise, dispatch, getStore) {
    if (!spacesPromise) {
      spacesPromise = getAllSpaces();
    }
    return spacesPromise
      .then((payload) => {
        let ret = {};
        if (payload.count > 0) {
          ret = payload.items.map(s => new Space(s)).reduce((spaces, s) => { spaces[s.itemid()] = s; return spaces; }, {});
        }
        return new Promise((resolve) => { resolve(new Spaces(ret, dispatch, getStore)); });
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

  /**
   * Dispatches a change to state
   * @param {Promise<object>} obj - Object to dispatch
   */
  dispatch(obj) {
    if (obj.action !== 'DIAG_CREATE' && obj.action !== 'DIAG_UPDATE' && obj.action !== 'DIAG_DELETE' && obj.action !== 'DIAG_LOAD') {
      return Promise.reject('invalid action, must be one of DIAG_CREATE, DIAG_UPDATE, DIAG_DELETE, or DIAG_LOAD');
    }
    return obj
      .then((action) => {
        this._dispatch(action);
        return Promise.resolve(action.payload);
      })
      .catch(error => {
        return dispatchError(error, this._dispatch, obj.action);
      });
  }

  /**
   * Reduces state change from an action
   * @param {object} state - Current state to modify
   * @param {object} action - Action to execute to mutate state
   * @returns {object} - Returns mutated state
   */
  static reduce(state, action) {
    if (!action || !action.payload) return state;
    const ret = Object.create(state.constructor.prototype);
    if (action.error) {
      Object.assign(ret, state, { error: action.error, status: action.status });
      return ret;
    }
    switch (action.type) {
    case 'DIAG_CREATE':
      return Object.assign(ret, state, action.payload.storeInsert());
    case 'DIAG_UPDATE':
      return Object.assign(ret, state, action.payload.storeUpdate());
    case 'DIAG_DELETE':
      return Object.assign(ret, state, action.payload.storeDelete());
    case 'DIAG_LOAD':
      if (action.payload.length && action.payload.length === 0) {
        return Object.assign(ret, state, { error: 'load called but payload not array' });
      }
      return Object.assign(ret, state, action.payload[0].storeLoad(action.payload));
    default:
      return Object.assign(ret, state, { error: 'invalid action' });
    }
  }
}
