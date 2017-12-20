import { postSpaceActivity, postDatasetActivity, postFileActivity, getSpaceActivity, getDatasetActivity } from '../api/activity';
import { checkEmpty } from '../utils/apputils';
import { AssetId } from '../utils';
import Spaces from './spaces';
import Space from './space';
import Dataset from './dataset';
import File from './file';
import Base from './base';

/** User activity */
export default class Activity extends Base {
  /**
   * Create activity
   * @param {Object} activity - Activity object from API
   */
  constructor(activity) {
    super(Spaces.store);
    Object.assign(this, activity);
  }

  /**
   * Saves new activity to the API
   * @param {(Space|Dataset|File)} parent - Parent object, can be Space, Dataset or File
   * @param {string} type - Type, search|upload|annotation for now
   * @param {Object} data - Full data of the activity. Should contain at minimum the ID object of what the activity references.
   */
  static create(parent, type, data) {
    let id;
    if (parent === undefined) {
      return Promise.reject('parent undefined');
    }
    if (!(parent instanceof Space || parent instanceof Dataset || parent instanceof File)) {
      id = new AssetId(parent);
      if (!id.valid() && !(parent instanceof Space || parent instanceof Dataset || parent instanceof File)) {
        return Promise.reject('parent is not a Space, Dataset, File or valid AssetId');
      }
    } else {
      id = parent.id;
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
    if (!('item_id' in (data.id || {}))) {
      console.log(data);
      return Promise.reject('data.id is not ID object');
    }
    let ret;
    if (parent instanceof Space || id._type === 'space') {
      ret = postSpaceActivity(id.item_id, type, data);
    } else if (parent instanceof Dataset || id._type === 'dataset') {
      ret = postDatasetActivity(id.space_id, id.item_id, type, data);
    } else if (parent instanceof File || id._type === 'file') {
      ret = postFileActivity(id.space_id, id.dataset_id, id.item_id, type, data);
    }
    return ret
      .then(payload => (
        checkEmpty(payload, () => (
          new Promise(resolve => resolve(new Activity(payload.items[0])))
        ))
      ));
  }

  /**
   * Loads activity from the api
   * @param {(Space|Dataset|string)} parent - Space, Dataset or AssetId to load activity for
   * @returns Promise<Activity>
   */
  static load(parent) {
    let id;
    if (parent === undefined) {
      return Promise.reject('parent undefined');
    }
    if (!(parent instanceof Space || parent instanceof Dataset)) {
      id = new AssetId(parent);
      if (!id.valid() && !(parent instanceof Space || parent instanceof Dataset)) {
        return Promise.reject('parent is not a Space, Dataset or valid AssetId');
      }
    } else {
      id = parent.id;
    }
    let ret;
    if (parent instanceof Space || id._type === 'space') {
      ret = getSpaceActivity(id.item_id);
    } else if (parent instanceof Dataset || id._type === 'dataset') {
      ret = getDatasetActivity(id.space_id, id.item_id);
    }
    return ret
      .then(payload => (
        payload.items.map(i => new Activity(i))
      ));
  }
}
