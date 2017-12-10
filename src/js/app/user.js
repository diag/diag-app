import {
  getUser, getPrefs, putPrefs,
} from '../api/users';
import Spaces from './spaces';
import Base from './base';

/** Space containing datasets and activity */
export default class User extends Base {
  constructor(user) {
    super(Spaces.store);
    Object.assign(this, user);
  }

  /**
   * Returns a copy of ourself
   * @returns {User}
   */
  copy() {
    const ret = super.copy();
    ret.prefs = { ...ret.prefs };
    return ret;
  }

  /**
   * Returns our id
   */
  itemid() { return this.id; }

  /**
   * Returns URL for this space
   * @returns {string}
   */
  url() { return User.url(this.id); }

  /**
   * Returns URL for the user given a user id
   * @returns {string}
   */
  static url(userId) { return userId === undefined ? undefined : `/users/${userId}`; }

  /**
   * Fetches a user from the API by id
   * @param {string} userId - ID of the user to retrieve from the API, defaults to 'me'
   * @returns {Promise<User[]>}
   */
  static load(userId) {
    let loadPrefs = false;
    if (!userId) {
      userId = 'me';
      loadPrefs = true;
    }
    let user;
    // We only support returning a single user
    return getUser(userId)
      .then((payload) => payload.items.map(u => new User(u)))
      .then((u) => {
        if (u.length === 0) {
          return Promise.reject('User not found');
        }
        user = u[0];
        if (loadPrefs) {
          return getPrefs();
        }
        return Promise.resolve();
      })
      .then((payload) => {
        if (loadPrefs) {
          user.prefs = payload;
        }
        return Promise.resolve([user]);
      });
  }

  /**
   * Update user in the API
   * @returns {Promise<Space>}
   */
  updatePrefs() {
    return putPrefs({ prefs: this.prefs })
      .then((payload) => {
        const ret = this.copy();
        ret.prefs = payload;
        return Promise.resolve(ret);
      });
  }
}
