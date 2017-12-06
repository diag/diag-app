import * as tu from '../../js/utils/testutils';
import {
  getAllSpaces, getSpace, postSpace, postDataset, getDataset
} from '../../js/api/datasets';
import { Spaces, Space, Dataset, File, Activity, Annotation } from '../../js/app';
import fetch from 'node-fetch';
import { polyfill as promisePolyfill } from 'es6-promise';

global.fetch = fetch;

/* eslint no-unused-vars: off */

jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;

promisePolyfill();

const TID = tu.getTID();
const spaceId = `space${TID}`;
let spaceName = `spacename${TID}`;
const space2Id = `space2${TID}`;
const space2Name = `spacename${TID}`;
const owner = `user@${TID}`;
let dataset1Id;
let dataset2Id;
let file1Id;
let file2Id;
let file3Id;

let spaces;
let space;
let space2;
let dataset1;
let dataset2;
let file1;
let file2;
let file3;
let spaceact;
let datasetact;
let datasetact2;
let fileact;
let annot;
let annot2;

let app;
beforeAll(() => (tu.testSetup('app-test', TID)));
afterAll(() => (tu.testTearDown('app-test')));

const catchErr = (err) => {
  console.log(err);
  if (typeof err.text === 'function') {
    err.text().then(payload => console.log(payload));
  } else {
    console.log(err);
  }
};

describe('App Spaces', () => {
  describe('Using the Spaces object', () => {
    it('Wont save without spaceId', () => (
      expect(Space.create(undefined)).rejects.toBeDefined()
    ));

    it('should create a space', () => (
      Space.create(spaceId, spaceName)
        .then((s) => {
          expect(s.itemid()).toBe(spaceId);
          expect(s.name).toBe(spaceName);
          space = s;
        })
        .catch(catchErr)
    ));

    it('should update a space', () => {
      spaceName = `${spaceName}_updated`;
      space.name = spaceName;
      return space.update()
        .then((s) => {
          expect(s.name).toBe(spaceName);
          space = s;
        })
        .catch(catchErr);
    });

    it('should load spaces', () => (
      Spaces.load(undefined, () => {}, () => ({ spaces }))
        .then((ss) => {
          spaces = ss;
          expect(spaces.spaces().length).toBeGreaterThan(0);
        })
        .catch(catchErr)
    ));

    it('Can find our test space', () => {
      space = spaces.space(spaceId);
      const s = spaces.space(spaceId);
      expect(s.space()).toBe(s);
      expect(s.itemid()).toBe(spaceId);
      expect(s.name).toBe(spaceName);
      expect(s.owner).toBe(owner);
    });

    it('Can insert new spaces', () => (
      Space.create(space2Id, space2Name)
        .then((s) => {
          const newss = spaces.insert(s);
          expect(newss).not.toBe(spaces);
          expect(newss.space(space2Id)).toBeTruthy();
          expect(spaces.space(space2Id).itemid()).not.toBeTruthy();
          space2 = s;
          spaces = newss;
        })
    ));
  });

  describe('Space object', () => {
    it('copy should be a copy', () => {
      const s = spaces.space(spaceId);
      const scopy = s.copy();
      expect(scopy).not.toBe(s);
      expect(scopy).toEqual(s);
    });

    it('should return the right itemid', () => {
      expect(spaces.space(spaceId).itemid()).toBe(spaceId);
    });

    it('should return itself', () => {
      const s = spaces.space(spaceId);
      expect(s.space()).toBe(s);
    });

    it('datasets should be empty', () => {
      const s = spaces.space(spaceId);
      expect(s.datasets().length).toBe(0);
    });

    it('should return a url', () => {
      const s = spaces.space(spaceId);
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
      const s = spaces.space(spaceId);
      const props = s.props();
      expect(props.created_at).toBeDefined();
      expect(props._parent).not.toBeDefined();
    });
  });
});

describe('App Datasets', () => {
  describe('Using the Dataset object', () => {
    it('Wont save without space', () => {
      expect(Dataset.create(undefined)).rejects.toBeDefined();
    });
    it('Wont save with space not a space object', () => {
      expect(Dataset.create('foo')).rejects.toBeDefined();
    });
    it('Wont save without name', () => {
      expect(Dataset.create(space, undefined)).rejects.toBeDefined();
    });
    it('Wont save with tags as string', () => {
      expect(Dataset.create(space, 'failtest', 'failtestdescr', 'foo')).rejects.toBeDefined();
    });
    it('Can save dataset 1', (done) => {
      Dataset.create(space, tu.dataset1orig.name, tu.dataset1orig.description, tu.dataset1orig.tags, tu.dataset1orig.problem, tu.dataset1orig.resolution)
        .then((payload) => {
          dataset1Id = payload.itemid();
          expect(dataset1Id).toBeTruthy();
          expect(payload.space().itemid()).toBe(space.itemid());
          done();
        });
    });

    it('loads', () => (
      space.load()
        .then((payload) => {
          space = payload;
          spaces = spaces.update(space);
          expect(space.datasets().length).toBe(1);
        })
    ));

    it('Can save dataset 2', (done) => {
      Dataset.create(space, tu.dataset2orig.name, tu.dataset2orig.description, tu.dataset2orig.tags, tu.dataset2orig.problem, tu.dataset2orig.resolution)
        .then((payload) => {
          dataset2Id = payload.itemid();
          expect(dataset2Id).toBeTruthy();
          expect(payload.space().itemid()).toBe(space.itemid());
          dataset2 = payload;
          spaces = spaces.insertDataset(dataset2);
          done();
        });
    });

    it('can access dataset1', () => {
      dataset1 = space.dataset(dataset1Id);
      expect(dataset1.name).toBe(tu.dataset1orig.name);
      expect(dataset1.description).toBe(tu.dataset1orig.description);
      expect(dataset1.problem).toBe(tu.dataset1orig.problem);
      expect(dataset1.resolution).toBe(tu.dataset1orig.resolution);
    });

    it('cant access dataset2', () => {
      const ds2 = space.dataset(dataset2Id);
      expect(ds2.itemid()).not.toBeTruthy();
    });

    it('copy should be a copy', () => {
      const dcopy = dataset1.copy();
      expect(dcopy).not.toBe(dataset1);
      expect(dcopy.props()).toEqual(dataset1.props());
    });

    it('should return the right itemid', () => {
      expect(dataset1.itemid()).toBe(dataset1Id);
    });

    it('should return itself', () => {
      expect(dataset1.dataset()).toBe(dataset1);
    });

    it('files should be empty', () => {
      expect(dataset1.files().length).toBe(0);
    });

    it(`parent should be ${spaceId}`, () => {
      expect(dataset1.space()).toBe(space);
      expect(dataset1.space().itemid()).toBe(spaceId);
    });

    it('should return a url', () => {
      expect(dataset1.url()).toBe(`/dataset/${dataset1.space().itemid()}/${dataset1.itemid()}`);
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
      const d = dataset1;
      const props = d.props();
      expect(props.created_at).toBeDefined();
      expect(props._parent).not.toBeDefined();
    });
  });

  describe('More App Space', () => {
    it('can insert a dataset', (done) => {
      const news2 = space2.insertDataset(dataset1);
      expect(news2).not.toBe(space2);
      expect(news2.dataset(dataset1Id)).toBeTruthy();
      expect(space2.dataset(dataset1Id).itemid()).not.toBeTruthy();
      space2 = news2;
      done();
    });

    it('can update', (done) => {
      const newds1 = dataset1.copy();
      newds1.name = 'dataset1changed';
      newds1.update()
        .then((updatedds) => {
          expect(updatedds.name).toBe(newds1.name);
          const news = newds1.space().updateDataset(newds1);
          expect(news).not.toBe(newds1.space());
          expect(news.dataset(newds1.itemid()).name).toBe(newds1.name);
          expect(space.dataset(newds1.itemid()).name).not.toBe(newds1.name);
          done();
        });
    });
  });

  describe('More App Dataset', () => {
    it('Can save file 3', () => (
      File.create(dataset1, tu.file3orig.name, tu.file3orig.description, tu.file3orig.contentType, tu.file3orig.content.length, tu.file3orig.content)
        .then((f) => {
          file3 = f;
          file3Id = f.itemid();
          expect(file3Id).toBeTruthy();
          expect(file3.dataset().itemid()).toBe(dataset1.itemid());
        })
    ));

    it('can insert file', () => {
      const newd1 = dataset1.insertFile(file3);
      expect(newd1).not.toBe(dataset1);
      expect(newd1.file(file3Id)).toBeTruthy();
      expect(dataset1.file(file3Id)).not.toBeTruthy();
      dataset1 = newd1;
    });
  });

  describe('Spaces mutations', () => {
    it('Can update a space', () => {
      space.foo = 'test';
      const newSpaces = spaces.update(space);
      expect(newSpaces).not.toBe(spaces);
      expect(newSpaces.space(space.itemid()).foo).toBe('test');
    });

    it('Can insert a dataset', () => {
      const sid = dataset2.space().itemid();
      const did = dataset2.dataset().itemid();
      const newSpaces = spaces.insertDataset(dataset2);
      expect(newSpaces).not.toBe(spaces);
      expect(newSpaces.dataset(sid, did).itemid()).toBe(dataset2.itemid());
      spaces = newSpaces;
    });

    // it('Can insert activity', () => {
    //   const sid = datasetact2.space().itemid();
    //   const newSpaces = Spaces.reduce(spaces, datasetact2.);
    //   expect(newSpaces).not.toBe(spaces);
    //   expect(newSpaces.space(sid).activity().find(a => a.itemid() === datasetact2.itemid())).toBeTruthy();
    //   spaces = newSpaces;
    // });

    it('Can insert a file', () => {
      const sid = file2.space().itemid();
      const did = file2.dataset().itemid();
      const fid = file2.itemid();
      const newSpaces = spaces.insertFile(file2);
      expect(newSpaces).not.toBe(spaces);
      expect(newSpaces.file(sid, did, fid).content()).toBe(file2.content());
      spaces = newSpaces;
    });

    it('Can insert an annotation', () => {
      const sid = annot2.space().itemid();
      const did = annot2.dataset().itemid();
      const newSpaces = spaces.insertAnnotation(annot2);
      expect(newSpaces).not.toBe(spaces);
      const ds = newSpaces.dataset(sid, did);
      const annotations = ds.annotations(file2.itemid());
      expect(annotations.find(a => a.itemid() === annot2.itemid())).toBeTruthy();
      spaces = newSpaces;
    });

    it('Can update a file', () => {
      const sid = file2.space().itemid();
      const did = file2.dataset().itemid();
      const fid = file2.itemid();
      const f2 = spaces.file(sid, did, fid).copy();
      f2.name = 'foo';
      const newSpaces = spaces.updateFile(f2);
      expect(newSpaces).not.toBe(spaces);
      expect(newSpaces.file(sid, did, fid).name).toBe(f2.name);
      expect(spaces.file(sid, did, fid).name).not.toBe(f2.name);
      spaces = newSpaces;
    });

    it('Can update a dataset', () => {
      const sid = dataset2.space().itemid();
      const did = dataset2.dataset().itemid();
      const ds2 = spaces.dataset(sid, did).copy();
      ds2.name = 'foo';
      const newSpaces = spaces.updateDataset(ds2);
      expect(newSpaces).not.toBe(spaces);
      expect(newSpaces.dataset(sid, did).name).toBe(ds2.name);
      expect(spaces.dataset(sid, did).name).not.toBe(ds2.name);
      spaces = newSpaces;
    });

    it('errors with invalid space id', () => (
      expect(spaces.setCurrentSpace('foo')).rejects.toBeDefined()
    ));

    it('Can set a current space with space obj', () => (
      spaces.setCurrentSpace(space)
        .then((newSpaces) => {
          expect(newSpaces).not.toBe(spaces);
          expect(newSpaces.currentSpace()).toBe(spaces.space(space.itemid()));
          expect(newSpaces.currentSpaceId()).toBe(space.itemid());
        })
    ));

    it('Can set a current space with space id', () => (
      spaces.setCurrentSpace(space.itemid())
        .then((newSpaces) => {
          expect(newSpaces).not.toBe(spaces);
          expect(newSpaces.currentSpace()).toBe(spaces.space(space.itemid()));
          expect(newSpaces.currentSpaceId()).toBe(space.itemid());
          spaces = newSpaces;
        })
    ));

    it('errors with invalid dataset id', () => (
      expect(spaces.setCurrentDataset('foo')).rejects.toBeDefined()
    ));

    it('Can set a dataset with dataset obj', () => (
      spaces.setCurrentDataset(dataset2)
        .then((newSpaces) => {
          expect(newSpaces).not.toBe(spaces);
          expect(newSpaces.currentDataset()).toBe(spaces.dataset(dataset2.space().itemid(), dataset2.itemid()));
          expect(newSpaces.currentSpaceId()).toBe(dataset2.space().itemid());
          expect(newSpaces.currentDatasetId()).toBe(dataset2.itemid());
        })
    ));

    it('Can set a dataset with dataset id', () => (
      spaces.setCurrentDataset(dataset2.itemid())
        .then((newSpaces) => {
          expect(newSpaces).not.toBe(spaces);
          expect(newSpaces.currentDataset()).toBe(spaces.dataset(dataset2.space().itemid(), dataset2.itemid()));
          expect(newSpaces.currentSpaceId()).toBe(dataset2.space().itemid());
          expect(newSpaces.currentDatasetId()).toBe(dataset2.itemid());
          spaces = newSpaces;
        })
    ));
  });
});

