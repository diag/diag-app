import * as tu from '../../js/utils/testutils';
import { Spaces, Space, Dataset, File } from '../../js/app';
import fetch from 'node-fetch';
import { polyfill as promisePolyfill } from 'es6-promise';

// Redux
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { DIAG_CREATE, DIAG_LOAD } from '../../js/actions';

global.fetch = fetch;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
promisePolyfill();

let td;

beforeAll(() => {
  td = tu.testData();
  return tu.testSetup('file-test', td.TID)
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
    .then((spaces) => {
      td.spaces = Spaces.reduce(new Spaces(), { type: 'DIAG_LOAD', payload: spaces });
      td.space = () => td.spaces.space(td.spaceId);
      return Dataset.create(td.space(), td.d1orig.name, td.d1orig.description, td.d1orig.tags, td.d1orig.problem, td.d1orig.resolution);
    })
    .then((dataset) => {
      td.datasetId = dataset.itemid();
      td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_CREATE', payload: dataset });
      td.dataset = () => td.spaces.dataset(td.spaceId, td.datasetId);
      return Dataset.create(td.space(), td.d2orig.name, td.d2orig.description, td.d2orig.tags, td.d2orig.problem, td.d2orig.resolution);
    })
    .then((dataset2) => {
      td.dataset2Id = dataset2.itemid();
      td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_CREATE', payload: dataset2 });
      td.dataset2 = () => td.spaces.dataset(td.spaceId, td.dataset2Id)
    });
});
afterAll(() => (tu.testTearDown('file-test')));

describe('App Files', () => {
  it('Wont save without dataset', () => {
    expect(File.create(undefined)).rejects.toBeDefined();
  });
  it('Wont save without a dataset object', () => {
    expect(File.create('foo')).rejects.toBeDefined();
  });
  it('Wont save without a name', () => {
    expect(File.create(td.dataset(), undefined)).rejects.toBeDefined();
  });
  it('Wont save without content type', () => {
    expect(File.create(td.dataset(), td.f1orig.name, td.f1orig.description, undefined, undefined)).rejects.toBeDefined();
  });
  it('Wont save without size', () => {
    expect(File.create(td.dataset(), td.f1orig.name, td.f1orig.description, td.f1orig.contentType, undefined)).rejects.toBeDefined();
  });
  it('Wont save without content', () => {
    expect(File.create(td.dataset(), td.f1orig.name, td.f1orig.description, td.f1orig.contentType, td.f1orig.content.length, undefined)).rejects.toBeDefined();
  });

  it('Can save file 1', () => (
    File.create(td.dataset(), td.f1orig.name, td.f1orig.description, td.f1orig.contentType, td.f1orig.content.length, td.f1orig.content)
      .then((f) => {
        td.file1 = f;
        td.file1Id = f.itemid();
        expect(td.file1Id).toBeTruthy();
        expect(td.file1.dataset().itemid()).toBe(td.dataset().itemid());
      })
      .catch((err) => {
        console.log(err);
      })
  ));

  it('wont load without dataset', () => {
    expect(File.load(undefined)).rejects.toBeDefined();
  });

  it('File.load() loads', () => (
    File.load(td.dataset())
      .then((payload) => {
        td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_LOAD', payload });
        expect(td.dataset().files()).toHaveLength(1);
      })
      .catch((err) => {
        console.log(err);
      })
  ));

  it('Can save file 2', () => (
    File.create(td.dataset2(), td.f2orig.name, td.f2orig.description, td.f2orig.contentType, td.f2orig.content.length, td.f2orig.content)
      .then((f) => {
        td.file2 = f;
        td.file2Id = f.itemid();
        expect(td.file2Id).toBeTruthy();
        expect(td.file2.dataset().itemid()).toBe(td.dataset2().itemid());
      })
      .catch((err) => {
        console.log(err);
      })
  ));

  it('has file1', () => {
    const f1 = td.dataset().file(td.file1Id);
    expect(f1.itemid()).toBe(td.file1Id);
    expect(td.dataset().files().find(f => f.itemid() === td.file1Id).itemid()).toBe(td.file1Id);
    expect(f1.dataset().itemid()).toBe(td.file1.dataset().itemid());
    expect(f1.space()).toBe(td.file1.space());
  });

  it('does not have file2', () => {
    const f2 = td.dataset2().file(td.file2Id);
    expect(f2.itemid()).not.toBeTruthy();
  });

  it('can go up and back down', () => {
    const f1 = td.dataset().file(td.file1Id);
    expect(f1.dataset().file(td.file1Id)).toBe(f1);
  });

  it('can download a file', () => {
    const f1 = td.dataset().file(td.file1Id);
    return f1.load()
      .then((payload) => {
        expect(payload._content).toBe(td.file1._content);
      });
  });

  it('copy should be a copy', () => {
    const fcopy = td.file1.copy();
    expect(fcopy).not.toBe(td.file1);
    expect(fcopy).toEqual(td.file1);
  });

  it('should return a url', () => {
    expect(td.file1.url()).toBe(`/files/${td.file1.space().itemid()}/${td.file1.dataset().itemid()}/${td.file1.itemid()}`);
  });

  it('itemid should return undefined if itemid is undefined', () => {
    const f = new File();
    expect(f.itemid()).not.toBeDefined();
  });

  it('should return undefined if itemid is undefined', () => {
    const f = new File();
    expect(f.url()).not.toBeDefined();
  });

  it('should return props', () => {
    const f = td.file1;
    const props = f.props();
    expect(props.created_at).toBeDefined();
    expect(props._parent).not.toBeDefined();
  });
});

describe('Redux Files', () => {
  beforeEach(() => {
    td.store.clearActions();
  });

  describe('actions', () => {
    it('fileCreate inserts a new file', () => (
      Spaces.dispatchCreate(File.create(td.dataset(), td.f1orig.name, td.f1orig.description, td.f1orig.contentType, td.f1orig.content.length, td.f1orig.content))
        .then(() => {
          const actions = td.store.getActions();
          // Now includes activity
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_CREATE);
          expect(actions[0].payload).toBeInstanceOf(File);
          expect(actions[0].payload.content()).toBe(td.f1orig.content);
          td.fileCreateAction = actions[0];
          td.file = td.fileCreateAction.payload;
        })
    ));

    it('fileLoad returns the file', () => (
      Spaces.dispatchLoad(File.load(td.dataset()))
        .then(() => {
          const actions = td.store.getActions();
          expect(actions.length).toBeGreaterThan(0);
          expect(actions[0].type).toBe(DIAG_LOAD);
          expect(actions[0].payload.length).toBeGreaterThan(0);
          td.fileLoadAction = actions[0];
          td.file = td.fileLoadAction.payload;
        })
    ));
  });
});
