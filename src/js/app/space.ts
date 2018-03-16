import {
  getSpace, postSpace, patchSpace, patchSpaceNew,
} from '../api/datasets';
import Spaces from './spaces';
import Dataset from './dataset';
import Base from './base';
import * as types from '../typings'
import Bot from './bot';

/** Space containing datasets and activity */
export default class Space extends Base implements types.ISpace {
  id: types.id;
  name: string;
  public?: number;
  dataset_cf_schema?: any;
  dataset_cf_uischema?: any;
  ftr: types.FTR;

  constructor(space?) {
    super(Spaces.store);
    Object.assign(this, space, { _store: Spaces.store });
  }

  /**
   * Returns URL for this space
   * @returns {string}
   */
  url(): string { return Space.url(this.id); }

  /**
   * Returns any bots associated with this space
   */
  bots() : Bot[] {
    if (typeof this._store().bots !== 'function') {
      return [];
    }
    return this._store().bots(this.id.item_id);
  }

  /**
   * Returns URL for the space given a space id
   * @returns {string}
   */
  static url(sid: types.id): string { return sid === undefined || sid.item_id === undefined ? undefined : `/space/${sid.item_id}`; }

  /**
   * Fetches a space from the API by id
   * @param {string} spaceId - ID of the space to retrieve from the API
   * @returns {Promise<dataset>}
   */
  static load(spaceId: string): Promise<Array<Space>> {
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
   * @param {(boolean)} public - Public space
   * @param {(object)} dataset_cf_schema - Custom Fields JSON Schema
   * @param {(object)} dataset_cf_uischema - Custom Fields UI JSON Schema
   * @returns {Promise<Space>}
   */
  static create(id: types.id, name: string, publicSpace?: boolean, dataset_cf_schema?: any, dataset_cf_uischema?: any): Promise<Space>;
  static create(id, name, publicSpace = false, dataset_cf_schema = undefined, dataset_cf_uischema = undefined) {
    if (id === undefined) {
      return Promise.reject('id undefined');
    }
    return postSpace(id, name, publicSpace, dataset_cf_schema, dataset_cf_uischema)
      .then(Space._newSpace);
  }
  /**
   * Update space in the API
   * @returns {Promise<Space>}
   */
  update(): Promise<Space> {
    return patchSpace(this.id.item_id, this.name, this.dataset_cf_schema, this.dataset_cf_uischema, this.ftr)
      .then((payload) => {
        const ret = this.copy() as Space;
        if (payload.count > 0) {
          Object.assign(ret, payload.items[0]);
        }
        return Promise.resolve(ret);
      });
  }

  static _newSpace(payload: types.IAPIPayload): Promise<Space> {
    if (payload.count > 0) {
      return Promise.resolve(new Space(payload.items[0]));
    }
    return Promise.reject('Empty result set');
  }

  /// new API
  static patch(id: types.id, fields2change: any) : Promise<Space>{
    return patchSpaceNew(id.item_id, fields2change)
      .then(Space._newSpace);
  }
}
