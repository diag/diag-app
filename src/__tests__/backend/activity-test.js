import * as tu from '../../js/utils/testutils';
import { Spaces, Space, Dataset, File, Activity } from '../../js/app';
import fetch from 'node-fetch';
import { polyfill as promisePolyfill } from 'es6-promise';

// Redux
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { DIAG_CREATE } from '../../js/actions';
import { AssetId } from '../../js/utils';

global.fetch = fetch;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
promisePolyfill();

let td;

beforeAll(() => {
  td = tu.testData();
  return tu.testSetup('activity-test', td.TID)
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
    .then(() => Spaces.load())
    .then((ss) => {
      td.spaces = Spaces.reduce(new Spaces(), { type: 'DIAG_LOAD', payload: ss });
      td.space = () => td.spaces.space(td.spaceId);
      return Dataset.create(td.space(), td.d1orig.name, td.d1orig.description, td.d1orig.tags, td.d1orig.problem, td.d1orig.resolution);
    })
    .then((dataset) => {
      td.datasetId = dataset.itemid();
      td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_CREATE', payload: dataset });
      td.dataset = () => td.spaces.dataset(td.spaceId, td.datasetId);
      return File.create(td.dataset(), td.f1orig.name, td.f1orig.description, td.f1orig.contentType, td.f1orig.content.length, td.f1orig.content);
    })
    .then((file) => {
      td.fileId = file.itemid();
      td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_CREATE', payload: file });
      td.file = () => td.spaces.file(td.spaceId, td.datasetId, td.fileId);
    });
});
afterAll(() => (tu.testTearDown('activity-test')));

describe('App Activity', () => {
  it('Wont save without parent', () => {
    expect(Activity.create(undefined)).rejects.toBeDefined();
  });
  it('Wont save without a Space, Dataset or File object', () => {
    expect(Activity.create('foo')).rejects.toBeDefined();
  });
  it('Wont save without a type', () => {
    expect(Activity.create(td.dataset(), undefined)).rejects.toBeDefined();
  });
  it('Wont save without data object', () => {
    expect(Activity.create(td.dataset(), 'create', undefined)).rejects.toBeDefined();
  });
  it('Wont save without data.id object', () => {
    expect(Activity.create(td.dataset(), 'create', { foo: 'foo' })).rejects.toBeDefined();
  });

  it('Saves for a space', () => {
    Activity.create(td.space(), 'create', { id: td.space().id })
      .then((a) => {
        td.spaceact = a;
        expect(a.itemid()).toBeTruthy();
        expect(a.space().itemid()).toBe(td.space().itemid());
      })
      .catch(tu.catchErr);
  });

  it('Saves for a dataset', () => (
    Activity.create(td.dataset(), 'create', { id: td.dataset().id })
      .then((a) => {
        td.datasetact = a;
        expect(a.itemid()).toBeTruthy();
        expect(a.space().itemid()).toBe(td.dataset().space().itemid());
        expect(a.dataset().itemid()).toBe(td.dataset().itemid());
      })
  ));

  it('Saves for a file', () => (
    Activity.create(new AssetId(td.file().id).toString(), 'create', { id: td.file().id })
      .then((a) => {
        td.fileact = a;
        expect(a.itemid()).toBeTruthy();
        expect(a.space().itemid()).toBe(td.file().space().itemid());
        expect(a.dataset().itemid()).toBe(td.file().dataset().itemid());
        expect(a.file().itemid()).toBe(td.file().itemid());
      })
  ));

  it('waits', (done) => {
    setTimeout(done, 1000);
  });

  it('wont load if space undefined', () => {
    expect(Activity.load()).rejects.toBeDefined();
  });

  it('wont load if not passed a space object', () => {
    expect(Activity.load('foo')).rejects.toBeDefined();
  });

  it('Can be read back', () => (
    Activity.load(td.space())
      .then((payload) => {
        // Directly mutate state for tests
        td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_LOAD', payload });
        // Since space has a closure which refers to the state
        // we should be readable from everywhere
        expect(td.space().activity().find(a => a.id.item_id === td.datasetact.itemid())).toBeTruthy();
      })
  ));

  it('Can be read back from an AssetId', () => (
    Activity.load(new AssetId(td.space().id).toString())
      .then((payload) => {
        // Directly mutate state for tests
        td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_LOAD', payload });
        // Since space has a closure which refers to the state
        // we should be readable from everywhere
        expect(td.space().activity().find(a => a.id.item_id === td.datasetact.itemid())).toBeTruthy();
      })
  ));

  it('Can be read back from a dataset', () => (
    Activity.load(new AssetId(td.dataset().id).toString())
      .then((payload) => {
        // Directly mutate state for tests
        td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_LOAD', payload });
        // Since space has a closure which refers to the state
        // we should be readable from everywhere
        expect(td.dataset().activity().find(a => a.id.item_id === td.datasetact.itemid())).toBeTruthy();
      })
  ));

  it('Can be read back from dataset', () => {
    expect(td.dataset()).toBeTruthy();
    expect(td.dataset().activity().find(a => a.id.item_id === td.datasetact.itemid())).toBeTruthy();
  });

  it('copy should be a copy', () => {
    const acopy = td.datasetact.copy();
    expect(acopy).not.toBe(td.datasetact);
    expect(acopy).toEqual(td.datasetact);
  });

  it('itemid should return undefined if itemid is undefined', () => {
    const a = new Activity();
    expect(a.itemid()).not.toBeDefined();
  });

  it('should return props', () => {
    const a = td.datasetact;
    const props = a.props();
    expect(props.created_at).toBeDefined();
    expect(props._parent).not.toBeDefined();
  });

  // HACK Mutating state causes other tests to break when inserting activity
  // describe('Even more App Space', () => {
  //   it('can insert activity', () => {
  //     const news2 = space2.insertActivity(datasetact);
  //     expect(news2).not.toBe(space2);
  //     expect(news2.dataset(dataset1Id).activity()).toBeTruthy();
  //     // HACK Mutating state breaks this test
  //     // expect(space2.dataset(dataset1Id).activity()).toHaveLength(0);
  //     space2 = news2;
  //   });
  // });
});
