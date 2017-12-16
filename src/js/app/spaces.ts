import { getAllSpaces } from '../api/datasets';
import { updateHeaders } from '../utils/apiutils';
import Space from './space';
import Dataset from './dataset';
import File from './file';
import Activity from './activity';
import Annotation from './annotation';
import User from './user';
import APIPayload from '../api/types';

let _store;
let _dispatch;
let _apiHost = 'https://app.diag.ai';
let _apiBase = '/api/v1';
let _initialized = false;

interface id {
  item_id: string;
  space_id?: string;
  dataset_id?: string;
  file_id?: string;
  type?: string;
}

/** Top level class representing all spaces we have access to */
export default class Spaces {
  _currentSpaceId: string;
  _currentDatasetId: string;
  version: number;
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
  static init(dispatch: Function, getStore: Function) {
    _dispatch = dispatch;
    _store = () => getStore().spaces;
    _initialized = true;
  }

  /**
   * Sets API URL
   * @param {string} url - API Host, defaults to https://app.diag.ai
   */
  static setApiHost(url: string) {
    _apiHost = url;
  }

  /**
   * Sets API Base
   * @param {string} base - API url base, defaults to /api/v1
   */
  static setApiBase(base: string) {
    _apiBase = base;
  }

  /**
   * Sets API Authorization token
   * @param {string} token - API Token to authenticate with
   */
  static setApiToken(token: string) {
    updateHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Retrieives the API URL
   * @returns {string}
   */
  static apiUrl() : string {
    return `${_apiHost}${_apiBase}`;
  }

  /**
   * Retrieves the API Host - defaults to https://app.diag.ai/
   * @returns {string}
   */
  static apiHost() : string {
    return _apiHost;
  }

  /**
   * Returns our current store
   * @returns {object}
   */
  static store() : Object{
    if (!_store) {
      return {};
    }
    return _store();
  }

  /**
   * Returns whether we've initialized the Spaces store
   * @returns {bool}
   */
  static initialized() : boolean { return _initialized; }

  /**
   * Returns a copy of Spaces
   * @returns {Spaces}
   */
  copy() : Spaces {
    const ret = new Spaces();
    ret._currentSpaceId = this._currentSpaceId;
    ret._currentDatasetId = this._currentDatasetId;
    return ret;
  }

  /**
   * All spaces
   * @returns {Space[]}
   */
  spaces() : any { return Space.storeListByClass(this, {}); }

  /**
   * Space to return
   * @param {string} sid - Space to return
   * @returns {Space}
   * */
  space(sid: string) : Space {
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
  dataset(sid: string, did: string) : Dataset {
    const id = { space_id: sid, item_id: did };
    let ret = Dataset.storeGetByClass(this, id);
    if (!ret) {
      ret = new Dataset(undefined);
    }
    return ret;
  }

  /**
   * Datasets to return
   * @param {string} sid - Space ID
   * @returns {Dataset[]}
   */
  datasets(sid: string) : Dataset[] {
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
  file(sid: string, did: string, fid: string) {
    const id = { space_id: sid, dataset_id: did, item_id: fid };
    let ret = File.storeGetByClass(this, id);
    if (!ret) {
      ret = new File(undefined);
    }
    return ret;
  }

  /**
   * Files to return
   * @param {object} id - ID to filter files
   * @returns {File[]}
   */
  files(id: id) : File[] {
    return File.storeListByClass(this, id);
  }

  /**
   * Spaces owned by a user
   * @param {string} owner - Owner
   * @returns {Space[]}
   */
  spacesForUser(owner: string) : Space[] { return (this.spaces().filter(s => s.owner === owner) || []); }

  /**
   * Returns current space
   * @returns {Space}
   */
  currentSpace() : Space { return this._currentSpaceId === undefined ? new Space() : this.space(this._currentSpaceId); }

  /**
   * Returns current dataset
   * @returns {Dataset}
   */
  currentDataset() : Dataset { return (this._currentSpaceId === undefined || this._currentDatasetId === undefined) ? new Dataset(undefined) : this.dataset(this._currentSpaceId, this._currentDatasetId); }

  /**
   * Returns current space ID
   * @returns {string}
   */
  currentSpaceId() : string { return this._currentSpaceId; }

  /**
   * Returns current dataset ID
   * @returns {string}
   */
  currentDatasetId() : string { return this._currentDatasetId; }

  /**
   * Returns activity for id
   * @param {object} id - ID object to filter on
   * @returns {Activity[]}
   */
  activity(id: id) : Activity[] { return Activity.storeListByClass(this, id); }

  /**
   * Returns annotations for id
   * @param {object} id - ID object to filter on
   * @returns {Annotation[]}
   */
  annotations(id: id) : Annotation[] { return Annotation.storeListByClass(this, id); }

  /**
   * Returns users matching a given id
   * @param {string} id - ID to filter on
   */
  users(id: id) : User[] { return User.storeListByClass(this, id); }

  /**
   * Returns user matching a given id
   * @param {string} id - ID to filter on
   */
  user(id: id) : User { return User.storeGetByClass(this, id); }

  /**
   * Load from API
   * @param {Promise<APIPayload>} spacesPromise - Promise which returns a list of spaces
   * @returns {Promise<Space[]>}
  */
  static load(spacesPromise: Promise<APIPayload>) : Promise<Space[]> {
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
  static dispatchCreate(promise: Promise<Object>) : Promise<Object> {
    return Spaces.dispatch('DIAG_CREATE', promise);
  }

  /**
   * Dispatches a load change to state
   * @param {Promise<object>} promise - Unresolved promise with a payload to dispatch
   * @returns {Promise<object} - Returns promise payload as an unresolved promise
   */
  static dispatchLoad(promise: Promise<Object>) : Promise<Object> {
    return Spaces.dispatch('DIAG_LOAD', promise);
  }

  /**
   * Dispatches a update change to state
   * @param {Promise<object>} promise - Unresolved promise with a payload to dispatch
   * @returns {Promise<object} - Returns promise payload as an unresolved promise
   */
  static dispatchUpdate(promise: Promise<Object>) : Promise<Object> {
    return Spaces.dispatch('DIAG_UPDATE', promise);
  }

  /**
   * Dispatches a delete change to state
   * @param {Promise<object>} promise - Unresolved promise with a payload to dispatch
   * @returns {Promise<object} - Returns promise payload as an unresolved promise
   */
  static dispatchDelete(promise: Promise<Object>) : Promise<Object> {
    return Spaces.dispatch('DIAG_DELETE', promise);
  }

  /**
   * Dispatches a change to state
   * @param {string} action - action to send to redux
   * @param {Promise<object>} promise - Unresolved promise with a payload to dispatch
   * @returns {Promise<object} - Returns promise payload as an unresolved promise
   */
  static dispatch(action: string, promise: Promise<Object>) : Promise<Object> {
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
  static reduce(state: any = new Spaces(), action: any) {
    if (!action || !(action.payload || action.error)) return state;
    if (action.type !== 'DIAG_CREATE' && action.type !== 'DIAG_UPDATE'
      && action.type !== 'DIAG_DELETE' && action.type !== 'DIAG_LOAD' && action.type !== 'DIAG_ERROR') {
      return state;
    }
    let ret;
    if (state.constructor) {
      ret = Object.create(state.constructor.prototype);
    } else {
      ret = Object.create(state);
    }
    if (action.error || action.type === 'DIAG_ERROR') {
      Object.assign(ret, state, { error: action.error, status: action.status });
      return ret;
    }
    switch (action.type) {
      case 'DIAG_CREATE':
        Object.assign(ret, state, action.payload.storeInsert());
        break;
      case 'DIAG_UPDATE':
        Object.assign(ret, state, action.payload.storeUpdate());
        break;
      case 'DIAG_DELETE':
        Object.assign(ret, state, action.payload.storeDelete());
        break;
      case 'DIAG_LOAD':
        if (Array.isArray(action.payload) && action.payload.length === 0) {
          return state;
        }
        Object.assign(ret, state, action.payload[0].storeLoad(action.payload));
        break;
      default:
        break;
    }
    ret.version = state.version + 1;
    return ret;
  }
}
