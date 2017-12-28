import {
  getSpace, postSpace, patchSpace,
} from '../api/datasets';
import Spaces from './spaces';
import Base from './base';

/** Space containing datasets and activity */
export default class Space extends Base {
  constructor(space) {
    super(Spaces.store);
    Object.assign(this, space, { _store: Spaces.store });
  }

  /**
   * Returns URL for this space
   * @returns {string}
   */
  url() { return Space.url(this.id); }

  /**
   * Returns URL for the space given a space id
   * @returns {string}
   */
  static url(sid) { return sid === undefined || sid.item_id === undefined ? undefined : `/space/${sid.item_id}`; }

  /**
   * Fetches a space from the API by id
   * @param {string} spaceId - ID of the space to retrieve from the API
   * @returns {Promise<dataset>}
   */
  static load(spaceId) {
    if (!spaceId) {
      return Promise.reject('spaceId undefined');
    }
    return getSpace(spaceId)
      .then((payload) => payload.items.map(s => new Space(s)));
  }

  /**
   * Saves space to the API
   * @param {string} id - Space ID to create
   * @param {string} name - Space name
   * @returns {Promise<Space>}
   */
  static create(id, name) {
    if (id === undefined) {
      return Promise.reject('id undefined');
    }
    return postSpace(id, name)
      .then((payload) => {
        if (payload.count > 0) {
          return Promise.resolve(new Space(payload.items[0]));
        }
        return Promise.reject('Empty result set');
      });
  }
  /**
   * Update space in the API
   * @returns {Promise<Space>}
   */
  update() {
    return patchSpace(this.id.item_id, this.name)
      .then((payload) => {
        const ret = this.copy();
        if (payload.count > 0) {
          Object.assign(ret, payload.items[0]);
        }
        return Promise.resolve(ret);
      });
  }
}
