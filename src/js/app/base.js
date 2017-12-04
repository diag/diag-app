import { props } from '../utils/apputils';

export default class Base {
  constructor(parent) {
    // _store is a function which will return Spaces
    this._store = (parent || {})._store;
  }

  /**
   * Returns non-private activity properties in a shallow object copy
   * @returns {object}
   */
  props() { return props(this); }

  /**
   * Returns a shallow copy of ourself
   * @returns {object}
   */
  copy() {
    const ret = Object.create(this.constructor.prototype);
    return Object.assign(ret, this);
  }

  /**
   * Gets the name of the key we store ourselves in our parent
   * @returns {string}
   */
  _getKey() {
    return `_${this.constructor.name.toLowerCase()}`;
  }

  /**
   * Gets existing objects stored in the parent
   * @returns {Array<object>}
   */
  _getSelfs() {
    return this._store()[this._getKey()] || [];
  }

  /**
   * Finds self index in the store
   * @returns {integer}
   */
  _findSelfIndex() {
    return this._getSelfs().findIndex(o => o.id === this.id);
  }

  /**
   * ID of the item as a string
   * @returns {string}
  */
  itemid() { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * Name of the item
   * @returns {string}
   */
  itemname() { return this.name === undefined ? this.itemid() : this.name; }

  /**
   * The parent Space
   * @returns {Space}
   */
  space() {
    const spaceId = this.id.space_id ? this.id.space_id : this.id.item_id;
    if (!spaceId) {
      return undefined;
    }
    return this._store().space(spaceId);
  }

  /**
   * The parent Dataset
   * @returns {Dataset}
   */
  dataset() {
    const datasetId = this.id.dataset_id ? this.id.dataset_id : this.id.item_id;
    const spaceId = this.id.space_id;
    if (!datasetId || !spaceId) {
      return undefined;
    }
    return this._store().dataset(spaceId, datasetId);
  }

  /**
   * The parent File
   * @returns {File}
   */
  file() {
    const fileId = this.id.file_id ? this.id.file_id : this.id.item_id;
    const datasetId = this.id.dataset_id;
    const spaceId = this.id.space_id;
    if (!fileId || !datasetId || !spaceId) {
      return undefined;
    }
    return this._store().file(spaceId, datasetId, fileId);
  }

  /**
   * Inserts this item into a copy of its parent
   * @returns {Diag}
   */
  storeInsert() {
    const ret = this._store().copy();
    const key = this._getKey();
    const selfs = this._getSelfs();
    const itemIdx = this._findSelfIndex();
    if (itemIdx === -1) {
      ret[key] = [...selfs, this];
    } else {
      ret[key] = [...selfs];
    }
    return ret;
  }

  /**
   * Loads an array of this object into a copy of its parent
   * @params {object[]} objs - Objects to load
   * @returns {Diag}
   */
  storeLoad(objs) {
    const ret = this._store().copy();
    ret[this._getKey()] = objs;
    return ret;
  }

  /**
   * Updates an item in a copy of its parent
   * @returns {Diag}
   */
  storeUpdate() {
    const insert = this.copy();
    const ret = this._store().copy();
    const selfs = this._getSelfs();
    const itemIdx = this._findSelfIndex();
    if (itemIdx > -1) {
      ret[this._getKey()] = [...selfs.slice(0, itemIdx), insert, ...selfs.slice(itemIdx + 1)];
    } else {
      ret[this._getKey()] = [...selfs];
    }
    return ret;
  }

  /**
   * Deletes an item in a copy of its parent
   * @returns {Diag}
  */
  storeDelete() {
    const ret = this._store().copy();
    const key = this._getKey();
    const selfs = this._getSelfs();
    const itemIdx = this._findSelfIndex();
    if (itemIdx > -1) {
      ret[key] = [...selfs.slice(0, itemIdx), ...selfs.slice(itemIdx + 1)];
    } else {
      ret[this._getKey()] = [...selfs];
    }
    return ret;
  }

  static _getFilterFunc(id) {
    let fFunc;
    if (id) {
      if ('file_id' in id) { // We're something below a file
        fFunc = (item) => (item.id.item_id === id.item_id && item.id.file_id === id.file_id && item.id.dataset_id === id.dataset_id && item.id.space_id === id.space_id);
      } else if ('dataset_id' in id) { // We're a file
        fFunc = (item) => (item.id.file_id === id.item_id && item.id.dataset_id === id.dataset_id && item.id.space_id === id.space_id);
      } else if ('space_id' in id) { // We're a dataset
        fFunc = (item) => (item.id.dataset_id === id.item_id && item.id.space_id === id.space_id);
      } else { // Nothing else in the id, we're filtering on space_id
        fFunc = (item) => item.id.space_id === id.item_id;
      }
    }
    return fFunc;
  }

  /**
   * Retrieves an item from the store based on the passed id
   * @param {object} id - ID to retrieve
   * @returns {object[]}
   */
  storeList(id) {
    const fFunc = Base._getFilterFunc(id);
    return this._getSelfs().filter(fFunc);
  }

  /**
   * Retrieves the first item from the store based on the passed id
   * @param {object} id - ID to retrieve
   * @returns {object}
   */
  storeGet(id) {
    const fFunc = Base._getFilterFunc(id);
    return this._getSelfs().find(fFunc);
  }
}
