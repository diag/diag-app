import { props } from '../utils/apputils';
import isEqual from 'lodash/fp/isEqual';

export default class Base {
  constructor(store) {
    // _store is a function which will return Spaces
    this._store = store;
  }

  get initialized(){
    return (typeof this._store === 'function');
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
    Object.assign(ret, this);
    return ret;
  }

  toSerializable(){
    const ret = Object.assign({}, this);
    delete ret._store; // can't be serialized
    return ret;
  }

  /**
   * Gets the name of the key we store ourselves in our parent
   * @returns {string}
   */
  static getKey(klass) {
    return `_${klass.toLowerCase()}`;
  }

  _getKey() {
    return Base.getKey(this.constructor.name);
  }

  /**
   * Gets existing objects stored in the parent
   * @returns {Array<object>}
   */
  _getSelfs() {
    return this._store()[this._getKey()] || [];
  }

  /**
   * Gets existing objects stored in the parent
   * @returns {Array<object>}
   */
  static getSelfs(klass, store) {
    return store[Base.getKey(klass)] || [];
  }

  /**
   * Finds self index in the store
   * @returns {integer}
   */
  _findSelfIndex() {
    return this._getSelfs().findIndex(o => isEqual(o.id, this.id));
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
    let spaceId;
    if (this.id) {
      spaceId = this.id.space_id ? this.id.space_id : this.id.item_id;
    }
    if (!spaceId) {
      return undefined;
    }
    if (typeof this._store().space !== 'function') {
      return undefined;
    }
    return this._store().space(spaceId);
  }

  /**
   * The parent Dataset
   * @param {string} did - Dataset ID to access
   * @returns {Dataset}
   */
  dataset(did) {
    let datasetId;
    if (!did) {
      datasetId = this.id.dataset_id ? this.id.dataset_id : this.id.item_id;
    } else {
      datasetId = did;
    }
    const spaceId = this.id.space_id ? this.id.space_id : this.id.item_id;
    if (!datasetId || !spaceId) {
      return undefined;
    }
    if (typeof this._store().dataset !== 'function') {
      return undefined;
    }
    return this._store().dataset(spaceId, datasetId);
  }

  /**
   * Child datasets
   */
  datasets() {
    if (!this.id) {
      return [];
    }
    const spaceId = this.id.space_id ? this.id.space_id : this.id.item_id;
    if (!spaceId) {
      return [];
    }
    if (typeof this._store().datasets !== 'function') {
      return [];
    }
    return this._store().datasets(spaceId);
  }

  /**
   * The parent File
   * @param {string} fid - File ID to access
   * @returns {File}
   */
  file(fid) {
    let fileId;
    if (!fid) {
      fileId = this.id.file_id ? this.id.file_id : this.id.item_id;
    } else {
      fileId = fid;
    }
    const datasetId = this.id.dataset_id ? this.id.dataset_id : this.id.item_id;
    const spaceId = this.id.space_id ? this.id.space_id : this.id.item_id;
    if (!fileId || !datasetId || !spaceId) {
      return undefined;
    }
    if (typeof this._store().file !== 'function') {
      return undefined;
    }
    return this._store().file(spaceId, datasetId, fileId);
  }

  /**
   * Child files
   */
  files() {
    if (!this.id) {
      return [];
    }
    const datasetId = this.id.dataset_id ? this.id.dataset_id : this.id.item_id;
    const spaceId = this.id.space_id;
    if (!datasetId || !spaceId) {
      return [];
    }
    const id = { space_id: spaceId, dataset_id: datasetId };
    if (typeof this._store().files !== 'function') {
      return [];
    }
    return this._store().files(id);
  }

  /**
   * Annotations
   */
  annotations() {
    if (typeof this._store().annotations !== 'function') {
      return [];
    }
    return this._store().annotations(this.id);
  }

  /**
   * Activity
   */
  activity() {
    if (typeof this._store().activity !== 'function') {
      return [];
    }
    return this._store().activity(this.id);
  }

  /**
   * Inserts this item into a copy of its parent
   * @returns {Diag}
   */
  storeInsert(objs) {
    const ret = this._store().copy();
    const key = this._getKey();
    const selfs = this._getSelfs();

    if (!objs) {
      objs = [this];
    }
    // now work on items in objs

    objs = objs.filter(o => selfs.findIndex(s => isEqual(o.id, s.id)) === -1);
    ret[key] = [...selfs, ...objs];
    return ret;
  }

  /**
   * Loads an array of this object into a copy of its parent
   * @params {object[]} objs - Objects to load
   * @returns {Diag}
   */
  storeLoad(objs) {
    const ret = this._store().copy();
    if (objs) {
      let selfs = this._getSelfs();
      if (!Array.isArray(objs)) {
        return ret[this._getKey()] = [...selfs];
      }
      selfs = selfs.filter(s => objs.findIndex(o => isEqual(o.id, s.id)) === -1);
      ret[this._getKey()] = [...selfs, ...objs];
    }
    return ret;
  }

  /**
   * Updates an item in a copy of its parent
   * @returns {Diag}
   */
  storeUpdate(objs) {
    const ret = this._store().copy();
    const selfs = this._getSelfs();
    const key = this._getKey();

    if (!objs) {
      objs = [this];
    }
    // now work on items in objs

    // copy and update in place
    const list = [...selfs];
    objs.forEach(o => {
      const itemIdx = list.findIndex(s => isEqual(o.id, s.id));
      if (itemIdx > -1) {
        list[itemIdx] = o.copy();
      }
    });
    ret[key] = list;
    return ret;
  }

  /**
   * Deletes an item in a copy of its parent
   * @returns {Diag}
  */
  storeDelete(objs) {
    const ret = this._store().copy();
    const key = this._getKey();
    const selfs = this._getSelfs();

    if (!objs) {
      objs = [this];
    }

    ret[key] = selfs.filter(s => objs.findIndex(o => isEqual(o.id, s.id)) === -1);
    return ret;
  }

  /* eslint no-lonely-if: off */
  static _getFilterFunc(id, type = 'list') {
    let fFunc;
    if (id) {
      if (typeof id === 'string') {
        fFunc = (item) => item.id.toString().indexOf(id) > -1;
      } else {
        if ('file_id' in id) { // We're something below a file
          fFunc = (item) => (item.id.item_id === id.item_id && item.id.file_id === id.file_id && item.id.dataset_id === id.dataset_id && item.id.space_id === id.space_id);
        } else if ('dataset_id' in id) { // We're a file
          if (type === 'get') {
            fFunc = (item) => (item.id.item_id === id.item_id && item.id.dataset_id === id.dataset_id && item.id.space_id === id.space_id);
          } else {
            fFunc = (item) => (item.id.file_id === id.item_id && item.id.dataset_id === id.dataset_id && item.id.space_id === id.space_id);
          }
        } else if ('space_id' in id) { // We're a dataset
          if (type === 'get') {
            fFunc = (item) => (item.id.item_id === id.item_id && item.id.space_id === id.space_id);
          } else {
            fFunc = (item) => (item.id.dataset_id === id.item_id && item.id.space_id === id.space_id);
          }
        } else { // Nothing else in the id, we're filtering on space_id
          if (type === 'get') {
            fFunc = (item) => item.id.item_id === id.item_id;
          } else {
            fFunc = (item) => item.id.space_id === id.item_id;
          }
        }
      }
    } else {
      fFunc = () => true;
    }
    return fFunc;
  }

  /**
   * Retrieves an array of items from the store based on the passed id
   * @param {object} id - ID to retrieve
   * @returns {object[]}
   */
  storeList(id) {
    const fFunc = Base._getFilterFunc(id);
    return this._getSelfs().filter(fFunc);
  }

  /**
   * Retreives an array of items from the store based on the passed id and class
   * @param {object} store - Parent datastore object
   * @param {object} id - ID to filter by
   * @returns {object[]}
   */
  static storeListByClass(store, id) {
    const fFunc = Base._getFilterFunc(id);
    return Base.getSelfs(this.name, store).filter(fFunc);
  }

  /**
   * Retrieves the first item from the store based on the passed id
   * @param {object} id - ID to retrieve
   * @returns {object}
   */
  storeGet(id) {
    const fFunc = Base._getFilterFunc(id, 'get');
    return this._getSelfs().find(fFunc);
  }

  /**
   * Retrieves the first item from the store based on the passed id and class
   * @param {object} id - ID to retrieve
   * @returns {object}
   */
  static storeGetByClass(store, id) {
    const fFunc = Base._getFilterFunc(id, 'get');
    return Base.getSelfs(this.name, store).find(fFunc);
  }
}
