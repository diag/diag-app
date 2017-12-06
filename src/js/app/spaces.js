import { getAllSpaces } from '../api/datasets';
import { dispatchError } from '../utils/uiutils';
import Space from './space';
import Dataset from './dataset';
import File from './file';
import Activity from './activity';
import Annotation from './annotation';
import Base from './base';

let _store;
let _dispatch;

/** Top level class representing all spaces we have access to */
export default class Spaces {
  /**
   * Creates Spaces, our holding object for state
   */
  constructor() {
    this._currentSpaceId = undefined;
    this._currentDatasetId = undefined;
  }

  /**
   * Initializes the API
   * @param {function} dispatch - Redux dispatch function
   * @param {function} getStore - Redux getStore function
   */
  static init(dispatch, getStore) {
    _dispatch = dispatch;
    _store = () => getStore().spaces;
  }

  /**
   * Returns our current store
   * @returns {object}
   */
  static store() {
    return _store();
  }

  /**
   * Returns a copy of Spaces
   * @returns {Spaces}
   */
  copy() {
    const ret = new Spaces();
    ret._currentSpaceId = this._currentSpaceId;
    ret._currentDatasetId = this._currentDatasetId;
    return ret;
  }

  /**
   * All spaces
   * @returns {Space[]}
   */
  spaces() { return Base.storeListByClass(Space, this, {}); }

  /**
   * Space to return
   * @param {string} sid - Space to return
   * @returns {Space}
   * */
  space(sid) {
    const id = { item_id: sid };
    return Space.storeGetByClass(Space, this, id);
  }

  /**
   * Dataset to return
   * @param {string} sid - Space ID
   * @param {string} did - Dataset ID
   * @returns {Dataset}
   */
  dataset(sid, did) {
    const id = { space_id: sid, item_id: did };
    return Dataset.storeGetByClass(Dataset, this, id);
  }

  /**
   * Datasets to return
   * @param {string} sid - Space ID
   * @returns {Dataset[]}
   */
  datasets(sid) {
    const id = { space_id: sid };
    return Dataset.storeListByClass(Dataset, this, id);
  }

  /**
   * File to return
   * @param {string} sid - Space ID
   * @param {string} did - Dataset ID
   * @param {string} fid - File ID
   */
  file(sid, did, fid) {
    const id = { space_id: sid, dataset_id: did, item_id: fid };
    return File.storeGetByClass(File, this, id);
  }

  /**
   * Files to return
   * @param {object} id - ID to filter files
   * @returns {File[]}
   */
  files(id) {
    return File.storeListByClass(File, this, id);
  }

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

  /**
   * Returns activity for id
   * @param {object} id - ID object to filter on
   */
  activity(id) { return Activity.storeListByClass(Activity, this, id); }

  /**
   * Returns annotations for id
   * @param {object} id - ID object to filter on
   */
  annotations(id) { return Annotation.storeListByClass(Annotation, this, id); }

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
      .then((payload) => payload.items.map(s => new Space(s)));
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
   * Dispatches a create change to state
   * @param {Promise<object>} promise - Unresolved promise with a payload to dispatch
   * @returns {Promise<object} - Returns promise payload as an unresolved promise
   */
  static dispatchCreate(promise) {
    return Spaces.dispatch('DIAG_CREATE', promise);
  }

  /**
   * Dispatches a load change to state
   * @param {Promise<object>} promise - Unresolved promise with a payload to dispatch
   * @returns {Promise<object} - Returns promise payload as an unresolved promise
   */
  static dispatchLoad(promise) {
    return Spaces.dispatch('DIAG_LOAD', promise);
  }

  /**
   * Dispatches a update change to state
   * @param {Promise<object>} promise - Unresolved promise with a payload to dispatch
   * @returns {Promise<object} - Returns promise payload as an unresolved promise
   */
  static dispatchUpdate(promise) {
    return Spaces.dispatch('DIAG_UPDATE', promise);
  }

  /**
   * Dispatches a delete change to state
   * @param {Promise<object>} promise - Unresolved promise with a payload to dispatch
   * @returns {Promise<object} - Returns promise payload as an unresolved promise
   */
  static dispatchDelete(promise) {
    return Spaces.dispatch('DIAG_DELETE', promise);
  }

  /**
   * Dispatches a change to state
   * @param {string} action - action to send to redux
   * @param {Promise<object>} promise - Unresolved promise with a payload to dispatch
   * @returns {Promise<object} - Returns promise payload as an unresolved promise
   */
  static dispatch(action, promise) {
    if (action !== 'DIAG_CREATE' && action !== 'DIAG_UPDATE' && action !== 'DIAG_DELETE' && action !== 'DIAG_LOAD') {
      return Promise.reject('invalid action, must be one of DIAG_CREATE, DIAG_UPDATE, DIAG_DELETE, or DIAG_LOAD');
    }
    return promise
      .then((payload) => {
        _dispatch({ type: action, payload });
        return Promise.resolve(action.payload);
      })
      .catch(error => {
        return dispatchError(error, _dispatch, action);
      });
  }

  /**
   * Reduces state change from an action
   * @param {object} state - Current state to modify
   * @param {object} action - Action to execute to mutate state
   * @returns {object} - Returns mutated state
   */
  static reduce(state, action) {
    if (!action || !(action.payload || action.error)) return state;
    let ret;
    if (state.constuctor) {
      ret = Object.create(state.constructor.prototype);
    } else {
      ret = Object.create(state);
    }
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
      if (Array.isArray(action.payload) && action.payload.length === 0) {
        return state;
      }
      return Object.assign(ret, state, action.payload[0].storeLoad(action.payload));
    default:
      return Object.assign(ret, state, { error: 'invalid action' });
    }
  }
}
