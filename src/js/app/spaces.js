import { getAllSpaces } from '../api/datasets';
import { updateHeaders, getSessionId, setApiHost, setApiBase, apiHost, apiUrl, apiBase } from '../utils/apiutils';
import Space from './space';
import Dataset from './dataset';
import File from './file';
import Activity from './activity';
import Annotation from './annotation';
import User from './user';

let _store;
let _dispatch;
let _initialized = false;

/* eslint key-spacing: off */
const ACTIONS = {
  DIAG_CREATE: 'storeInsert',
  DIAG_UPDATE: 'storeUpdate',
  DIAG_DELETE: 'storeDelete',
  DIAG_LOAD:   'storeLoad',
  DIAG_ERROR:  'error',
};
/* eslint: key-spacing: on */

/** Top level class representing all spaces we have access to */
export default class Spaces {
  /**
   * Creates Spaces, our holding object for state
   */
  constructor() {
    this._currentSpaceId = undefined;
    this._currentDatasetId = undefined;
    this.version = 0;
  }

  /**
   * Initializes the API
   * @param {function} dispatch - Redux dispatch function
   * @param {function} getStore - Redux getStore function
   */
  static init(dispatch, getStore) {
    _dispatch = dispatch;
    _store = () => getStore().spaces;
    _initialized = true;
  }

  /**
   * Sets API URL
   * @param {string} url - API Host, defaults to https://app.diag.ai
   */
  static setApiHost(url) {
    setApiHost(url)
  }

  /**
   * Sets API Base
   * @param {string} base - API url base, defaults to /api/v1
   */
  static setApiBase(base) {
    setApiBase(base);
  }

  /**
   * Sets API Authorization token
   * @param {string} token - API Token to authenticate with
   */
  static setApiToken(token) {
    let bOrD = 'Bearer';
    if (token.match(/^\d+\.\w{12}$/)) {
      bOrD = 'Diag';
    }
    updateHeaders({ Authorization: `${bOrD} ${token}` });
  }

  /**
   * Retrieives the API URL
   * @returns {string}
   */
  static apiUrl() {
    return apiUrl();
  }

  /**
   * Retrieves the API Host - defaults to https://app.diag.ai/
   * @returns {string}
   */
  static apiHost() {
    return apiHost();
  }

  /**
   * Retrieives the API base, e.g. '/api/v1'
   * @returns {string}
   */
  static apiBase() {
    return apiBase();
  }

  /**
   * Returns our current store
   * @returns {object}
   */
  static store() {
    if (!_store) {
      return {};
    }
    return _store();
  }

  /**
   * Returns whether we've initialized the Spaces store
   * @returns {bool}
   */
  static initialized() { return _initialized; }

  /**
   * Returns a randomly generated sessionId
   * @returns {string}
   */
  static sessionId() { return getSessionId(); }

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
  spaces() { return Space.storeListByClass(this, {}); }

  /**
   * Space to return
   * @param {string} sid - Space to return
   * @returns {Space}
   * */
  space(sid) {
    const id = { item_id: sid };
    let ret = Space.storeGetByClass(this, id);
    if (!ret) {
      ret = new Space();
    }
    return ret;
  }

  /**
   * Dataset to return
   * @param {string} sid - Space ID
   * @param {string} did - Dataset ID
   * @returns {Dataset}
   */
  dataset(sid, did) {
    const id = { space_id: sid, item_id: did };
    let ret = Dataset.storeGetByClass(this, id);
    if (!ret) {
      ret = new Dataset();
    }
    return ret;
  }

  /**
   * Datasets to return
   * @param {string} sid - Space ID
   * @returns {Dataset[]}
   */
  datasets(sid) {
    let id;
    if (sid) {
      id = { space_id: sid };
    }
    return Dataset.storeListByClass(this, id);
  }

  /**
   * File to return
   * @param {string} sid - Space ID
   * @param {string} did - Dataset ID
   * @param {string} fid - File ID
   */
  file(sid, did, fid) {
    const id = { space_id: sid, dataset_id: did, item_id: fid };
    let ret = File.storeGetByClass(this, id);
    if (!ret) {
      ret = new File();
    }
    return ret;
  }

  /**
   * Files to return
   * @param {object} id - ID to filter files
   * @returns {File[]}
   */
  files(id) {
    return File.storeListByClass(this, id);
  }

  /**
   * Spaces owned by a user
   * @param {string} owner - Owner
   * @returns {Space[]}
   */
  spacesForUser(owner) { return (this.spaces().filter(s => s.owner === owner) || []); }

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
  activity(id) { return Activity.storeListByClass(this, id); }

  /**
   * Returns annotations for id
   * @param {object} id - ID object to filter on
   */
  annotations(id) { return Annotation.storeListByClass(this, id); }

  /**
   * Returns users matching a given id
   * @param {string} id - ID to filter on
   */
  users(id) { return User.storeListByClass(this, id); }

  /**
   * Returns user matching a given id
   * @param {string} id - ID to filter on
   */
  user(id) { return User.storeGetByClass(this, id); }

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
        return Promise.resolve(payload);
      });
  }

  /**
   * Reduces state change from an action
   * @param {object} state - Current state to modify
   * @param {object} action - Action to execute to mutate state
   * @returns {object} - Returns mutated state
   */
  static reduce(state = new Spaces(), action) {
    if (!action || !(action.payload || action.error)) return state;

    const actMethod = ACTIONS[action.type];
    if (actMethod === undefined) return state;

    let ret;
    if (state.constuctor) {
      ret = Object.create(state.constructor.prototype);
    } else {
      ret = Object.create(state);
    }
    if (action.error || action.type === 'DIAG_ERROR') {
      Object.assign(ret, state, { error: action.error, status: action.status });
      return ret;
    }

    let payload = action.payload;
    if (Array.isArray(payload) && payload.length === 0) {
      return state;
    } else if (!Array.isArray(payload)) {
      payload = [action.payload];
    }

    Object.assign(ret, state, payload[0][actMethod](payload));

    ret.version = state.version + 1;
    return ret;
  }
}
