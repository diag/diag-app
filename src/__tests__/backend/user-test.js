import * as tu from '../../js/utils/testutils';
import { Spaces, Space, User } from '../../js/app';
import fetch from 'node-fetch';
import { polyfill as promisePolyfill } from 'es6-promise';

// Redux
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { DIAG_LOAD, DIAG_UPDATE } from '../../js/actions';

global.fetch = fetch;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
promisePolyfill();

let td;

beforeAll(() => {
  td = tu.testData();
  return tu.testSetup('user-test', td.TID)
    .then(() => {
      const middlewares = [thunk];
      const mockStore = configureMockStore(middlewares);
      td.store = mockStore({ spaces: td.spaces });
    })
    .then(() => {
      Spaces.init(td.store.dispatch, () => ({ spaces: td.spaces }));
      return Promise.resolve();
    })
    .then(() => (Space.create(td.spaceId, td.spaceName)))
    .then(() => (Spaces.load()))
    .then((ss) => {
      td.spaces = Spaces.reduce(new Spaces(), { type: DIAG_LOAD, payload: ss });
      td.space = () => td.spaces.space(td.spaceId);
    });
});
afterAll(() => (tu.testTearDown('user-test')));

describe('App User', () => {
  describe('Using the User object', () => {
    it('should load ourself', () => (
      User.load()
        .then((u) => {
          td.spaces = Spaces.reduce(td.spaces, { type: DIAG_LOAD, payload: u });
          expect(td.spaces.users().length).toBeDefined();
        })
        .catch(td.catchErr)
    ));

    it('should access a list via users', () => {
      expect(td.spaces.users(td.owner)).toHaveLength(1);
      expect(td.spaces.users('nobody')).toHaveLength(0);
    });

    it('should access individual users via user', () => {
      const u = td.spaces.user(td.owner);
      expect(u).toBeTruthy();
      expect(u.id).toEqual(td.owner);
      expect(u.domains).toHaveLength(1);
    });

    it('should update prefs', () => {
      const u = td.spaces.user(td.owner);
      u.prefs.default_space = td.space().itemid();
      return u.updatePrefs()
        .then((newu) => {
          td.spaces = Spaces.reduce(td.spaces, { type: DIAG_UPDATE, payload: newu });
          expect(newu.prefs.default_space).toBe(td.space().itemid());
          expect(td.spaces.user(td.owner).prefs.default_space).toBe(td.space().itemid());
        });
    });

    it('should have preferences', () => {
      const u = td.spaces.user(td.owner);
      expect(u).toBeTruthy();
      expect(u.prefs).toBeTruthy();
      expect(u.prefs.default_space).toBe(td.space().itemid());
    });
  });
});

describe('Redux Users', () => {
  beforeEach(() => {
    td.store.clearActions();
  });

  describe('actions', () => {
    it('load loads user', () => (
      Spaces.dispatchLoad(User.load())
        .then(() => {
          const actions = td.store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_LOAD);
          expect(actions[0].payload[0]).toBeInstanceOf(User);
          expect(actions[0].payload[0].itemid()).toBe(td.owner);
          td.spaces = Spaces.reduce(td.spaces, { type: DIAG_LOAD, payload: actions[0].payload });
        })
    ));
    it('update updates prefs', () => {
      const u = td.spaces.user(td.owner);
      u.prefs.default_space = 'foo';
      return Spaces.dispatchUpdate(u.updatePrefs())
        .then(() => {
          const actions = td.store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_UPDATE);
          expect(actions[0].payload).toBeInstanceOf(User);
          expect(actions[0].payload.itemid()).toBe(td.owner);
          expect(actions[0].payload.prefs.default_space).toBe('foo');
        });
    });
  });
});

