import * as tu from '../../js/utils/testutils';
import { Spaces, Space, Bot } from '../../js/app';
import fetch from 'node-fetch';
import { polyfill as promisePolyfill } from 'es6-promise';
import { AssetId } from '../../js/utils';

// Redux
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { DIAG_CREATE, DIAG_LOAD, DIAG_UPDATE } from '../../js/actions';

global.fetch = fetch;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
promisePolyfill();

let td;

beforeAll(() => {
  td = tu.testData();
  return tu.testSetup('space-test', td.TID)
    .then(() => {
      const middlewares = [thunk];
      const mockStore = configureMockStore(middlewares);
      td.store = mockStore({ spaces: td.spaces });
    })
    .then(() => {
      Spaces.init(td.store.dispatch, () => ({ spaces: td.spaces }));
      return Promise.resolve();
    });
});
afterAll(() => (tu.testTearDown('space-test')));

describe('App Spaces', () => {
  describe('Using the Spaces object', () => {
    it('Wont save without spaceId', () => (
      expect(Space.create(undefined)).rejects.toBeDefined()
    ));

    it('should create a space', () => (
      Space.create(td.spaceId, td.spaceName)
        .then((s) => {
          expect(s.itemid()).toBe(td.spaceId);
          expect(s.name).toBe(td.spaceName);
          td.spaces = Spaces.reduce(new Spaces(), { type: 'DIAG_CREATE', payload: s });
          td.space = () => td.spaces.space(td.spaceId);
        })
        .catch(td.catchErr)
    ));

    it('should update a space', () => {
      const s = td.space();
      td.spaceName = `${td.spaceName}_updated`;
      s.name = td.spaceName;
      return s.update()
        .then((news) => {
          expect(news.name).toBe(td.spaceName);
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_UPDATE', payload: news });
        })
        .catch(td.catchErr);
    });

    it('should load spaces', () => (
      Spaces.load()
        .then((ss) => {
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_LOAD', payload: ss });
          expect(td.spaces.spaces().length).toBeGreaterThan(0);
        })
        .catch(td.catchErr)
    ));

    it('Can find our test space', () => {
      const s = td.spaces.space(td.spaceId);
      expect(s.itemid()).toBe(td.spaceId);
      expect(s.name).toBe(td.spaceName);
      expect(s.owner).toBe(td.owner);
    });

    it('Can insert new spaces', () => (
      Space.create(td.space2Id, td.space2Name)
        .then((s) => {
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_CREATE', payload: s });
          td.space2 = () => td.spaces.space(td.space2Id);
          expect(td.spaces.space(td.space2Id)).toBeTruthy();
        })
    ));
  });

  describe('Space object', () => {
    it('copy should be a copy', () => {
      const s = td.spaces.space(td.spaceId);
      const scopy = s.copy();
      expect(scopy).not.toBe(s);
      expect(scopy).toEqual(s);
    });

    it('should return the right itemid', () => {
      expect(td.spaces.space(td.spaceId).itemid()).toBe(td.spaceId);
    });

    it('should return itself', () => {
      const s = td.spaces.space(td.spaceId);
      expect(s.space()).toBe(s);
    });

    it('datasets should be empty', () => {
      const s = td.spaces.space(td.spaceId);
      expect(s.datasets().length).toBe(0);
    });

    it('should return a url', () => {
      const s = td.spaces.space(td.spaceId);
      expect(s.url()).toBe(`/space/${s.itemid()}`);
    });

    it('itemid should returned undefined if itemid is undefined', () => {
      const s = new Space();
      expect(s.itemid()).not.toBeDefined();
    });

    it('url should return undefined if itemid is undefined', () => {
      const s = new Space();
      expect(s.url()).not.toBeDefined();
    });

    it('should return props', () => {
      const s = td.spaces.space(td.spaceId);
      const props = s.props();
      expect(props.created_at).toBeDefined();
      expect(props._parent).not.toBeDefined();
    });

    // bot stuff 

    it('should not have any bots', () => {
      const bots = td.space().bots();
      expect(bots).toHaveLength(0);
    });

    it('should fail to create a bot', () => {
      const s = td.spaces.space(td.spaceId);
      const sid = new AssetId(s.id);
      return expect(Bot.create(sid, {})).rejects.toBeDefined();
    })

    it('should succeed to create a bot', () => {
      const s = td.spaces.space(td.spaceId);
      const sid = new AssetId(s.id);
      return Bot.create(sid, {name: 'diag', search: 'alexa OR google'})
        .then((b) => {
          b = b[0];
          expect(b.id.space_id).toBe(td.spaceId);
          expect(b.name).toBe('diag');
          expect(b.search).toBe('alexa OR google');
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_CREATE', payload: b });
          td.space = () => td.spaces.space(td.spaceId);
          td.botId = b.id;
        }).catch(td.catchErr)
    })

    it('should have one bot (created)', () => {
      const bots = td.space().bots();
      expect(bots).toHaveLength(1);
    });

    it('should update a bot', () => {
      const bid = new AssetId(td.botId);
      return Bot.update(bid, {name: 'new diag', search: 'siri OR alexa OR google'})
        .then((b) => {
          b = b[0];
          expect(b.id.space_id).toBe(td.spaceId);
          expect(b.name).toBe('new diag');
          expect(b.search).toBe('siri OR alexa OR google');
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_UPDATE', payload: b });
          td.space = () => td.spaces.space(td.spaceId);
        }).catch(td.catchErr)
    });

    it('should get a bot directly', () => {
      const bid = AssetId.create('bot', [td.botId.space_id, td.botId.item_id]);
      return Bot.load(bid)
        .then((b) => {
          b = b[0];
          expect(b.id.space_id).toBe(td.spaceId);
          expect(b.name).toBe('new diag');
          expect(b.search).toBe('siri OR alexa OR google');
        }).catch(td.catchErr)
    });

    it('should delete a bot', () => {
      const bid = new AssetId(td.botId);
      return Bot.delete(bid)
        .then((b) => {
          b = b[0];
          expect(b.id.space_id).toBe(td.spaceId);
          expect(b.name).toBe('new diag');
          expect(b.search).toBe('siri OR alexa OR google');
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_DELETE', payload: b });
          td.space = () => td.spaces.space(td.spaceId);
        }).catch(td.catchErr)
    });

    it('should not have any bots (deleted)', () => {
      const bots = td.space().bots();
      expect(bots).toHaveLength(0);
    });
    
  });
});

describe('Redux Spaces', () => {
  beforeEach(() => {
    td.store.clearActions();
  });

  describe('actions', () => {
    it('spaceCreate inserts a new space', () => (
      Spaces.dispatchCreate(Space.create(td.space3Id))
        .then(() => {
          const actions = td.store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_CREATE);
          expect(actions[0].payload).toBeInstanceOf(Space);
          expect(actions[0].payload.itemid()).toBe(td.space3Id);
          td.spaceCreateAction = actions[0];
          td.rspace = td.spaceCreateAction.payload;
        })
    ));
    it('spaceUpdate updates a space', () => {
      const s = td.rspace;
      s.name = `${s.name}_updated`;
      return Spaces.dispatchUpdate(s.update())
        .then(() => {
          const actions = td.store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_UPDATE);
          expect(actions[0].payload).toBeInstanceOf(Space);
          expect(actions[0].payload.itemid()).toBe(td.space3Id);
          expect(actions[0].payload.name).toBe(s.name);
          td.spaceUpdateAction = actions[0];
          td.rspace = td.spaceUpdateAction.payload;
        });
    });
    it('waits', (done) => {
      setTimeout(done, 1000);
    });
    it('spacesLoad downloads all spaces', () => (
      Spaces.dispatchLoad(Spaces.load())
        .then(() => {
          const actions = td.store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_LOAD);
          expect(actions[0].payload[0]).toBeInstanceOf(Space);
          expect(actions[0].payload[0].itemid()).toBeTruthy();
          td.spacesInitAction = actions[0];
        })
    ));
  });
});

