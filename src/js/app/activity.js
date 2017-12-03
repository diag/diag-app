import { postSpaceActivity, postDatasetActivity, postFileActivity } from '../api/activity';
import { props, checkEmpty } from '../utils/apputils';
import Space from './space';
import Dataset from './dataset';
import File from './file';

/** User activity */
export default class Activity {
  /**
   * Create activity
   * @param {Space} parent - Parent
   * @param {Object} activity - Activity object from API
   */
  constructor(parent, activity) {
    Object.assign(this, activity);
    this._parent = parent;
  }

  /**
   * Shallow copy of this file
   * @returns {File}
  */
  copy() { return new Activity(this._parent, this); }

  /**
   * Activity ID as a string
   * @returns {string}
  */
  itemid() { return typeof this.id !== 'object' ? undefined : this.id.item_id; }

  /**
   * The parent Space
   * @returns {Space}
   */
  space() { return this._parent.space(); }

  /**
   * The parent Dataset, if it exists for this activity. Can return undefined.
   * @returns {Dataset}
   */
  dataset() {
    if ('dataset_id' in this.id) {
      return this._parent.dataset(this.id.dataset_id);
    }
    return undefined;
  }

  /**
   * The parent file, if it exists for this activity. Can return undefined.
   * @returns {File}
   */
  file() {
    if ('file_id' in this.id && 'dataset_id' in this.id) {
      return this.space().dataset(this.id.dataset_id).file(this.id.file_id);
    }
    return undefined;
  }

  // TODO DG-101 This should be able to link back to an annotation
  // In the interim, we've leaked backend details into ActivityPanel.js
  // which will need to be cleaned up.
  static annotation() {
    return undefined;
  }

  /**
   * Returns non-private activity properties in a shallow object copy
   * @returns {object}
   */
  props() { return props(this); }

  /**
   * Saves new activity to the API
   * @param {(Space|Dataset|File)} parent - Parent object, can be Space, Dataset or File
   * @param {string} type - Type, search|upload|annotation for now
   * @param {Object} data - Full data of the activity. Should contain at minimum the ID object of what the activity references.
   */
  static create(parent, type, data) {
    if (parent === undefined) {
      return Promise.reject('parent undefined');
    }
    if (!(parent instanceof Space || parent instanceof Dataset || parent instanceof File)) {
      return Promise.reject('parent is not a Space, Dataset or File');
    }
    if (type === undefined) {
      return Promise.reject('type undefined');
    }
    if (data === undefined) {
      return Promise.reject('data undefined');
    }
    if (typeof data !== 'object') {
      return Promise.reject('data is not an object');
    }
    if (!('id' in data)) {
      return Promise.reject('data does not contain id object');
    }
    if (!('item_id' in data.id)) {
      return Promise.reject('data.id is not ID object');
    }
    let ret;
    if (parent instanceof Space) {
      ret = postSpaceActivity(parent.itemid(), type, data);
    } else if (parent instanceof Dataset) {
      ret = postDatasetActivity(parent.space().itemid(), parent.itemid(), type, data);
    } else if (parent instanceof File) {
      ret = postFileActivity(parent.space().itemid(), parent.dataset().itemid(), parent.itemid(), type, data);
    }
    return ret
      .then(payload => (
        checkEmpty(payload, () => (
          new Promise(resolve => resolve(new Activity(parent, payload.items[0])))
        ))
      ));
  }
}
