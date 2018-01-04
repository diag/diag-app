import * as tu from '../../js/utils/testutils';
import { Spaces, Space, Dataset, File } from '../../js/app';
import fetch from 'node-fetch';
import { polyfill as promisePolyfill } from 'es6-promise';

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
  return tu.testSetup('dataset-test', td.TID)
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
    .then(() => Space.create(td.space2Id, td.space2Name))
    .then(() => (Spaces.load()))
    .then((ss) => {
      td.spaces = Spaces.reduce(new Spaces(), { type: 'DIAG_LOAD', payload: ss });
      td.space = () => td.spaces.space(td.spaceId);
      td.space2 = () => td.spaces.space(td.space2id);
    });
});
afterAll(() => (tu.testTearDown('dataset-test')));

describe('App Datasets', () => {
  describe('Using the Dataset object', () => {
    it('Wont save without space', () => {
      expect(Dataset.create(undefined)).rejects.toBeDefined();
    });
    it('Wont save with space not a space object', () => {
      expect(Dataset.create('foo')).rejects.toBeDefined();
    });
    it('Wont save without name', () => {
      expect(Dataset.create(td.space(), undefined)).rejects.toBeDefined();
    });
    it('Wont save with tags as string', () => {
      expect(Dataset.create(td.space(), 'failtest', 'failtestdescr', 'foo')).rejects.toBeDefined();
    });
    it('Can save dataset 1', (done) => {
      Dataset.create(td.space(), td.d1orig.name, td.d1orig.description, td.d1orig.tags, td.d1orig.problem, td.d1orig.resolution)
        .then((payload) => {
          td.dataset1Id = payload.itemid();
          expect(td.dataset1Id).toBeTruthy();
          expect(payload.space().itemid()).toBe(td.space().itemid());
          done();
        });
    });

    it('loads', () => (
      Dataset.load(td.space().itemid(), td.dataset1Id)
        .then((payload) => {
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_LOAD', payload });
          expect(td.space().datasets().length).toBe(1);
          expect(td.space().datasets()[0].itemid()).toBe(td.dataset1Id);
        })
    ));

    it('Can save dataset 2', (done) => {
      Dataset.create(td.space().id.item_id, td.d2orig.name, td.d2orig.description, td.d2orig.tags, td.d2orig.problem, td.d2orig.resolution)
        .then((payload) => {
          td.dataset2Id = payload.itemid();
          expect(td.dataset2Id).toBeTruthy();
          expect(payload.space().itemid()).toBe(td.space().itemid());
          td.dataset2 = payload;
          // td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_CREATE', payload });
          done();
        });
    });

    it('can access dataset1', () => {
      td.dataset1 = td.space().dataset(td.dataset1Id);
      expect(td.dataset1.name).toBe(td.d1orig.name);
      expect(td.dataset1.description).toBe(td.d1orig.description);
      expect(td.dataset1.problem).toBe(td.d1orig.problem);
      expect(td.dataset1.resolution).toBe(td.d1orig.resolution);
    });

    it('cant access dataset2', () => {
      // We haven't reduced yet, so shouldn't be in the datamodel
      const ds2 = td.space().dataset(td.dataset2Id);
      expect(ds2.itemid()).not.toBeTruthy();
    });

    it('copy should be a copy', () => {
      const dcopy = td.dataset1.copy();
      expect(dcopy).not.toBe(td.dataset1);
      expect(dcopy.props()).toEqual(td.dataset1.props());
    });

    it('should return the right itemid', () => {
      expect(td.dataset1.itemid()).toBe(td.dataset1Id);
    });

    it('should return itself', () => {
      expect(td.dataset1.dataset()).toBe(td.dataset1);
    });

    it('files should be empty', () => {
      expect(td.dataset1.files().length).toBe(0);
    });

    it('parent should be same space', () => {
      expect(td.dataset1.space()).toBe(td.space());
      expect(td.dataset1.space().itemid()).toBe(td.spaceId);
    });

    it('should return a url', () => {
      expect(td.dataset1.url()).toBe(`/dataset/${td.dataset1.space().itemid()}/${td.dataset1.itemid()}`);
    });

    it('itemid should return undefined if itemid is undefined', () => {
      const d = new Dataset();
      expect(d.itemid()).not.toBeDefined();
    });

    it('url should return undefined if itemid is undefined', () => {
      const d = new Dataset();
      expect(d.url()).not.toBeDefined();
    });

    it('should return props', () => {
      const d = td.dataset1;
      const props = d.props();
      expect(props.created_at).toBeDefined();
      expect(props._parent).not.toBeDefined();
    });
  });

  describe('More App Space', () => {
    it('can update', (done) => {
      const newds1 = td.dataset1.copy();
      newds1.name = 'dataset1changed';
      newds1.update()
        .then((updatedds) => {
          expect(updatedds.name).toBe(newds1.name);
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_UPDATE', payload: updatedds });
          expect(td.spaces.dataset(newds1.space().itemid(), newds1.itemid()).name).toBe(newds1.name);
          done();
        });
    });
  });

  describe('More App Dataset', () => {
    it('Can save file 3', () => (
      File.create(td.dataset1, td.f3orig.name, td.f3orig.description, td.f3orig.contentType, td.f3orig.content.length, td.f3orig.content)
        .then((f) => {
          td.file3 = f;
          td.file3Id = f.itemid();
          expect(td.file3Id).toBeTruthy();
          expect(td.file3.dataset().itemid()).toBe(td.dataset1.itemid());
        })
    ));

    it('can insert file', () => {
      td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_CREATE', payload: td.file3 });
      expect(td.spaces.file(td.file3.space().itemid(), td.file3.dataset().itemid(), td.file3Id)).toBeTruthy();
    });
  });

  describe('Spaces mutations', () => {
    it('Can update a space', () => {
      const s = td.space();
      s.foo = 'test';
      s.update()
        .then((news) => {
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_UPDATE', payload: news });
          expect(news.foo).toBe('test');
          expect(td.space().foo).toBe('test');
        });
    });

    // it('Can update a file', () => {
    //   const sid = td.file3.space().itemid();
    //   const did = td.file3.dataset().itemid();
    //   const fid = td.file3.itemid();
    //   const f3 = td.spaces.file(sid, did, fid).copy();
    //   f3.name = 'foo';
    //   f3.update()
    //     .then((newf3) => {
    //       expect(td.spaces.file(sid, did, fid).name).not.toBe(f3.name);
    //       td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_UPDATE', payload: newf3 });
    //       expect(td.spaces.file(sid, did, fid).name).toBe(f3.name);
    //     });
    // });

    it('Can update a dataset', () => {
      const sid = td.dataset1.space().itemid();
      const did = td.dataset1.itemid();
      const ds1 = td.spaces.dataset(sid, did).copy();
      ds1.name = 'foo';
      ds1.update()
        .then((newds1) => {
          expect(td.spaces.dataset(sid, did).name).not.toBe(ds1.name);
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_UPDATE', payload: newds1 });
          expect(td.spaces.dataset(sid, did).name).toBe(ds1.name);
        });
    });

    it('Can delete a dataset', () => {
      td.dataset2.delete()
        .then((newds2) => {
          expect(td.dataset2.name).toBe(newds2.name);
          expect(td.dataset2.id.item_id).toBe(newds2.id.item_id);
          td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_DELETE', payload: newds2 });
          return Dataset.load(td.dataset2.id.space_id, td.dataset2.id.item_id);
        })
        .catch((err) => {
          expect(err.status).toBe(404);
        });
    });

    // it('errors with invalid space id', () => (
    //   expect(spaces.setCurrentSpace('foo')).rejects.toBeDefined()
    // ));

    // it('Can set a current space with space obj', () => (
    //   spaces.setCurrentSpace(space)
    //     .then((newSpaces) => {
    //       expect(newSpaces).not.toBe(spaces);
    //       expect(newSpaces.currentSpace()).toBe(spaces.space(space.itemid()));
    //       expect(newSpaces.currentSpaceId()).toBe(space.itemid());
    //     })
    // ));

    // it('Can set a current space with space id', () => (
    //   spaces.setCurrentSpace(space.itemid())
    //     .then((newSpaces) => {
    //       expect(newSpaces).not.toBe(spaces);
    //       expect(newSpaces.currentSpace()).toBe(spaces.space(space.itemid()));
    //       expect(newSpaces.currentSpaceId()).toBe(space.itemid());
    //       spaces = newSpaces;
    //     })
    // ));

    // it('errors with invalid dataset id', () => (
    //   expect(spaces.setCurrentDataset('foo')).rejects.toBeDefined()
    // ));

    // it('Can set a dataset with dataset obj', () => (
    //   spaces.setCurrentDataset(dataset2)
    //     .then((newSpaces) => {
    //       expect(newSpaces).not.toBe(spaces);
    //       expect(newSpaces.currentDataset()).toBe(spaces.dataset(dataset2.space().itemid(), dataset2.itemid()));
    //       expect(newSpaces.currentSpaceId()).toBe(dataset2.space().itemid());
    //       expect(newSpaces.currentDatasetId()).toBe(dataset2.itemid());
    //     })
    // ));

    // it('Can set a dataset with dataset id', () => (
    //   spaces.setCurrentDataset(dataset2.itemid())
    //     .then((newSpaces) => {
    //       expect(newSpaces).not.toBe(spaces);
    //       expect(newSpaces.currentDataset()).toBe(spaces.dataset(dataset2.space().itemid(), dataset2.itemid()));
    //       expect(newSpaces.currentSpaceId()).toBe(dataset2.space().itemid());
    //       expect(newSpaces.currentDatasetId()).toBe(dataset2.itemid());
    //       spaces = newSpaces;
    //     })
    // ));
  });
});

describe('Redux Datasets', () => {
  beforeEach(() => {
    td.store.clearActions();
  });

  describe('actions', () => {
    it('datasetCreate inserts a new dataset', () => (
      Spaces.dispatchCreate(Dataset.create(td.space(), tu.dataset1orig.name, tu.dataset1orig.description, tu.dataset1orig.tags, tu.dataset1orig.problem, tu.dataset1orig.resolution))
        .then(() => {
          const actions = td.store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_CREATE);
          expect(actions[0].payload).toBeInstanceOf(Dataset);
          expect(actions[0].payload).toMatchObject(td.d1orig);
          td.datasetCreateAction = actions[0];
          td.dataset = td.datasetCreateAction.payload;
        })
    ));

    it('datasetUpdate updates a dataset', () => {
      td.dataset.name = `${td.dataset.name}_updated`;
      td.dataset.description = `${td.dataset.description}_updated`;
      td.dataset.problem = `${td.dataset.problem}_updated`;
      td.dataset.resolution = `${td.dataset.resolution}_updated`;
      td.dataset.tags.push('updated');
      return Spaces.dispatchUpdate(td.dataset.update())
        .then(() => {
          const actions = td.store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_UPDATE);
          expect(actions[0].payload).toBeInstanceOf(Dataset);
          expect(actions[0].payload).toMatchObject(td.dataset);
          td.datasetUpdateAction = actions[0];
          td.dataset = td.datasetUpdateAction.payload;
        });
    });

    it('datasetLoad loads the dataset', () => (
      Spaces.dispatchLoad(Dataset.load(td.dataset.space().itemid(), td.dataset.itemid()))
        .then(() => {
          const actions = td.store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_LOAD);
          expect(actions[0].payload[0]).toBeInstanceOf(Dataset);
          expect(actions[0].payload[0].name).toBe(td.dataset.name);
          td.datasetLoadAction = actions[0];
          td.dataset = td.datasetLoadAction.payload;
        })
    ));
  });
});

