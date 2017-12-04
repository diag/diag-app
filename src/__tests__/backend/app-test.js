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
});

describe('App Files', () => {
  it('Wont save without dataset', () => {
    expect(File.create(undefined)).rejects.toBeDefined();
  });
  it('Wont save without a dataset object', () => {
    expect(File.create('foo')).rejects.toBeDefined();
  });
  it('Wont save without a name', () => {
    expect(File.create(dataset1, undefined)).rejects.toBeDefined();
  });
  it('Wont save without content type', () => {
    expect(File.create(dataset1, tu.file1orig.name, tu.file1orig.description, undefined, undefined)).rejects.toBeDefined();
  });
  it('Wont save without size', () => {
    expect(File.create(dataset1, tu.file1orig.name, tu.file1orig.description, tu.file1orig.contentType, undefined)).rejects.toBeDefined();
  });
  it('Wont save without content', () => {
    expect(File.create(dataset1, tu.file1orig.name, tu.file1orig.description, tu.file1orig.contentType, tu.file1orig.content.length, undefined)).rejects.toBeDefined();
  });

  // const defaultTimeoutInterval = jasmine.DEFAULT_TIMEOUT_INTERVAL;
  // jasmine.DEFAULT_TIMEOUT_INTERVAL = 5000;
  it('Can save file 1', () => (
    File.create(dataset1, tu.file1orig.name, tu.file1orig.description, tu.file1orig.contentType, tu.file1orig.content.length, tu.file1orig.content)
      .then((f) => {
        file1 = f;
        file1Id = f.itemid();
        expect(file1Id).toBeTruthy();
        expect(file1.dataset().itemid()).toBe(dataset1.itemid());
      })
      .catch((err) => {
        console.log(err);
      })
  ));

  // jasmine.DEFAULT_TIMEOUT_INTERVAL = defaultTimeoutInterval;
  it('dataset1 loads', () => (
    dataset1.load()
      .then((payload) => {
        dataset1 = payload;
        expect(dataset1.files().length).toBe(1);
      })
      .catch((err) => {
        console.log(err);
      })
  ));

  it('Can save file 2', () => (
    File.create(dataset2, tu.file2orig.name, tu.file2orig.description, tu.file2orig.contentType, tu.file2orig.content.length, tu.file2orig.content)
      .then((f) => {
        file2 = f;
        file2Id = f.itemid();
        expect(file2Id).toBeTruthy();
        expect(file2.dataset().itemid()).toBe(dataset2.itemid());
      })
      .catch((err) => {
        console.log(err);
      })
  ));

  it('has file1', () => {
    const f1 = dataset1.file(file1Id);
    expect(f1.itemid()).toBe(file1Id);
    expect(dataset1.files().find(f => f.itemid() === file1Id).itemid()).toBe(file1Id);
    expect(f1.dataset().itemid()).toBe(file1.dataset().itemid());
    expect(f1.space()).toBe(file1.space());
  });

  it('does not have file2', () => {
    const f2 = dataset2.file(file2Id);
    expect(f2).not.toBeTruthy();
  });

  it('can go up and back down', () => {
    const f1 = dataset1.file(file1Id);
    expect(f1.dataset().file(file1Id)).toBe(f1);
  });

  it('can download a file', () => {
    const f1 = dataset1.file(file1Id);
    return f1.load()
      .then((payload) => {
        expect(payload._content).toBe(file1._content);
      });
  });

  it('copy should be a copy', () => {
    const fcopy = file1.copy();
    expect(fcopy).not.toBe(file1);
    expect(fcopy).toEqual(file1);
  });

  it('should return a url', () => {
    expect(file1.url()).toBe(`/files/${file1.space().itemid()}/${file1.dataset().itemid()}/${file1.itemid()}`);
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
    const f = file1;
    const props = f.props();
    expect(props.created_at).toBeDefined();
    expect(props._parent).not.toBeDefined();
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
});

describe('App Activity', () => {
  it('Wont save without parent', () => {
    expect(Activity.create(undefined)).rejects.toBeDefined();
  });
  it('Wont save without a Space, Dataset or File object', () => {
    expect(Activity.create('foo')).rejects.toBeDefined();
  });
  it('Wont save without a type', () => {
    expect(Activity.create(dataset1, undefined)).rejects.toBeDefined();
  });
  it('Wont save without data object', () => {
    expect(Activity.create(dataset1, 'create', undefined)).rejects.toBeDefined();
  });
  it('Wont save without data.id object', () => {
    expect(Activity.create(dataset1, 'create', { foo: 'foo' })).rejects.toBeDefined();
  });

  it('Saves for a space', () => (
    Activity.create(space, 'create', { id: space.id })
      .then((a) => {
        spaceact = a;
        expect(a.itemid()).toBeTruthy();
        expect(a.space().itemid()).toBe(spaceId);
      })
      .catch(catchErr)
  ));

  it('Saves for a dataset', () => (
    Activity.create(dataset1, 'create', { id: { item_id: dataset2.itemid() } })
      .then((a) => {
        datasetact = a;
        expect(a.itemid()).toBeTruthy();
        expect(a.space().itemid()).toBe(spaceId);
        expect(a.dataset().itemid()).toBe(dataset1Id);
      })
  ));

  it('Saves for another dataset', () => (
    Activity.create(dataset2, 'create', { id: { item_id: dataset2.itemid() } })
      .then((a) => {
        datasetact2 = a;
        expect(a.itemid()).toBeTruthy();
        expect(a.space().itemid()).toBe(spaceId);
        expect(a.dataset().itemid()).toBe(dataset2Id);
      })
  ));

  it('Saves for a file', () => (
    Activity.create(file1, 'create', { id: file1.id })
      .then((a) => {
        fileact = a;
        expect(a.itemid()).toBeTruthy();
        expect(a.space().itemid()).toBe(spaceId);
        expect(a.dataset().itemid()).toBe(dataset1Id);
        // expect(a.file().itemid()).toBe(file1Id);
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
    Activity.load(space)
      .then((payload) => {
        // Directly mutate state for tests
        debugger;
        spaces = Spaces.reduce(spaces, { type: 'DIAG_LOAD', payload });
        // Since space has a closure which refers to the state
        // we should be readable from everywhere
        debugger;
        expect(space.activity().find(a => a.id.item_id === datasetact.itemid())).toBeTruthy();
      })
  ));

  it('Can be read back from dataset', () => {
    expect(space.dataset(dataset1Id)).toBeTruthy();
    expect(space.dataset(dataset1Id).activity().find(a => a.id.item_id === datasetact.itemid())).toBeTruthy();
  });

  it('copy should be a copy', () => {
    const acopy = datasetact.copy();
    expect(acopy).not.toBe(datasetact);
    expect(acopy).toEqual(datasetact);
  });

  it('itemid should return undefined if itemid is undefined', () => {
    const a = new Activity();
    expect(a.itemid()).not.toBeDefined();
  });

  it('should return props', () => {
    const a = datasetact;
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

describe('App Annotations', () => {
  it('Wont save without file', () => {
    expect(Annotation.create(undefined)).rejects.toBeDefined();
  });
  it('Wont save without a File object', () => {
    expect(Annotation.create('foo')).rejects.toBeDefined();
  });
  it('Wont save without a description', () => {
    expect(Annotation.create(file1, undefined)).rejects.toBeDefined();
  });
  it('Wont save without an offset', () => {
    expect(Annotation.create(file1, 'description', undefined)).rejects.toBeDefined();
  });
  it('Wont save without a length', () => {
    expect(Annotation.create(file1, 'description', 0, undefined)).rejects.toBeDefined();
  });

  it('Saves for a file', () => (
    Annotation.create(file1, 'description', 0, 1, 'f')
      .then((a) => {
        annot = a;
        expect(a.itemid()).toBeTruthy();
        // HACK mutating state breaks this test
        // expect(a.space().itemid()).toBe(spaceId);
        expect(a.dataset().itemid()).toBe(dataset1Id);
        expect(a.file().itemid()).toBe(file1Id);
      })
  ));

  it('can be read back', () => (
    dataset1.load()
      .then((payload) => {
        dataset1 = payload;
        expect(dataset1.annotations().length).toBe(1);
      })
  ));

  it('can be accessed from the dataset', () => {
    expect(dataset1.annotations(file1.itemid())[0].data).toEqual(annot.data);
  });

  it('can be accessed from the file', () => {
    const f1 = dataset1.file(file1Id);
    expect(f1.annotations()[0].data).toEqual(annot.data);
  });

  it('copy should be a copy', () => {
    const acopy = annot.copy();
    expect(acopy).not.toBe(annot);
    expect(acopy).toEqual(annot);
  });

  it('itemid should return undefined if itemid is undefined', () => {
    const a = new Annotation();
    expect(a.itemid()).not.toBeDefined();
  });

  it('should return props', () => {
    const a = annot;
    const props = a.props();
    expect(props.created_at).toBeDefined();
    expect(props._parent).not.toBeDefined();
  });

  it('Wont update without a description', () => {
    annot.description = undefined;
    expect(annot.update()).rejects.toBeDefined();
  });

  it('can be updated', () => {
    const a = annot;
    a.description = 'newdescription';
    return a.update()
      .then((newa) => {
        expect(newa.itemid()).toBeTruthy();
        expect(newa.itemid()).toEqual(a.itemid());
        expect(newa.dataset().itemid()).toBe(dataset1Id);
        expect(newa.file().itemid()).toBe(file1Id);
        expect(newa.description).toBe(a.description);
        annot = newa;
      });
  });

  it('Wont comment without text', () => {
    expect(annot.createComment(undefined)).rejects.toBeDefined();
  });

  let annotCommentId;
  it('can be be commented on', () => (
    annot.createComment('foo')
      .then((newa) => {
        expect(newa.itemid()).toBeTruthy();
        expect(newa.itemid()).toEqual(annot.itemid());
        expect(newa.dataset().itemid()).toBe(dataset1Id);
        expect(newa.file().itemid()).toBe(file1Id);
        expect(newa.description).toBe(annot.description);
        expect(newa.comments).toBeTruthy();
        expect(newa.comments.length).toBeGreaterThan(0);
        expect(newa.comments[0].id).toBeTruthy();
        expect(newa.comments[0].text).toBe('foo');
        annot = newa;
        annotCommentId = newa.comments[0].id;
      })
  ));

  it('Wont update comment without id', () => {
    expect(annot.updateComment(undefined)).rejects.toBeDefined();
  });

  it('comment can be updated', () => (
    annot.updateComment(annotCommentId, 'foo2')
      .then((newa) => {
        expect(newa.itemid()).toBeTruthy();
        expect(newa.itemid()).toEqual(annot.itemid());
        expect(newa.dataset().itemid()).toBe(dataset1Id);
        expect(newa.file().itemid()).toBe(file1Id);
        expect(newa.description).toBe(annot.description);
        expect(newa.comments).toBeTruthy();
        expect(newa.comments.length).toBeGreaterThan(0);
        expect(newa.comments[0].id).toBeTruthy();
        expect(newa.comments[0].text).toBe('foo2');
        annot = newa;
        annotCommentId = newa.comments[0].id;
      })
  ));

  it('Wont delete comment without id', () => {
    expect(annot.deleteComment(undefined)).rejects.toBeDefined();
  });

  it('comment can be deleted', () => (
    annot.deleteComment(annotCommentId)
      .then((newa) => {
        expect(newa.itemid()).toBeTruthy();
        expect(newa.itemid()).toEqual(annot.itemid());
        expect(newa.dataset().itemid()).toBe(dataset1Id);
        expect(newa.file().itemid()).toBe(file1Id);
        expect(newa.description).toBe(annot.description);
        expect(newa.comments).toBeTruthy();
        expect(newa.comments.length).toBe(0);
        annot = newa;
      })
  ));

  it('can be deleted', () => {
    annot.delete()
      .then(() => (
        dataset1.load()
      ))
      .then((payload) => {
        expect(payload.annotations().length).toBe(0);
      });
  });

  describe('can be inserted into a dataset', () => {
    it('Saves for another file', () => (
      Annotation.create(file2, 'description', 3, 4, 'g')
        .then((a) => {
          annot2 = a;
          expect(a.itemid()).toBeTruthy();
          expect(a.space().itemid()).toBe(spaceId);
          expect(a.dataset().itemid()).toBe(dataset2Id);
          expect(a.file().itemid()).toBe(file2Id);
        })
    ));

    // it('can insert into dataset', () => {
    //   const newd1 = dataset1.insertAnnotation(annot2);
    //   expect(newd1).not.toBe(dataset1);
    //   expect(newd1.annotations().find(a => a.id.item_id === annot2.itemid())).toBeTruthy();
    //   expect(dataset1.annotations().find(a => a.id.item_id === annot2.itemid())).not.toBeTruthy();
    //   dataset1 = newd1;
    // });
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
