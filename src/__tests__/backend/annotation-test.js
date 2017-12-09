import * as tu from '../../js/utils/testutils';
import { Spaces, Space, Dataset, File, Annotation } from '../../js/app';
import fetch from 'node-fetch';
import { polyfill as promisePolyfill } from 'es6-promise';

import isEqual from 'lodash/fp/isEqual';

// Redux
import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { DIAG_CREATE, DIAG_LOAD, DIAG_UPDATE, DIAG_DELETE } from '../../js/actions';

global.fetch = fetch;
jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;
promisePolyfill();

let td;

beforeAll(() => {
  td = tu.testData();
  return tu.testSetup('annotation-test', td.TID)
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
afterAll(() => (tu.testTearDown('annotation-test')));

describe('App Annotations', () => {
  it('Wont save without file', () => {
    expect(Annotation.create(undefined)).rejects.toBeDefined();
  });
  it('Wont save without a File object', () => {
    expect(Annotation.create('foo')).rejects.toBeDefined();
  });
  it('Wont save without a description', () => {
    expect(Annotation.create(td.file(), undefined)).rejects.toBeDefined();
  });
  it('Wont save without an offset', () => {
    expect(Annotation.create(td.file(), 'description', undefined)).rejects.toBeDefined();
  });
  it('Wont save without a length', () => {
    expect(Annotation.create(td.file(), 'description', 0, undefined)).rejects.toBeDefined();
  });

  it('Saves for a file', () => (
    Annotation.create(td.file(), 'description', 0, 1, 'f')
      .then((a) => {
        td.annot = a;
        expect(a.itemid()).toBeTruthy();
        // HACK mutating state breaks this test
        // expect(a.space().itemid()).toBe(spaceId);
        expect(a.dataset().itemid()).toBe(td.datasetId);
        expect(a.file().itemid()).toBe(td.fileId);
      })
  ));

  it('can be read back', () => (
    Annotation.load(td.dataset())
      .then((payload) => {
        // Directly mutate state for tests
        td.spaces = Spaces.reduce(td.spaces, { type: 'DIAG_LOAD', payload });
        expect(td.dataset().annotations().length).toBe(1);
      })
  ));

  it('can be accessed from the dataset', () => {
    expect(td.dataset().annotations(td.file().itemid())[0].data).toEqual(td.annot.data);
  });

  it('can be accessed from the file', () => {
    const f1 = td.dataset().file(td.fileId);
    expect(f1.annotations()[0].data).toEqual(td.annot.data);
  });

  it('copy should be a copy', () => {
    const acopy = td.annot.copy();
    expect(acopy).not.toBe(td.annot);
    expect(acopy).toEqual(td.annot);
  });

  it('itemid should return undefined if itemid is undefined', () => {
    const a = new Annotation();
    expect(a.itemid()).not.toBeDefined();
  });

  it('should return props', () => {
    const a = td.annot;
    const props = a.props();
    expect(props.created_at).toBeDefined();
    expect(props._parent).not.toBeDefined();
  });

  it('Wont update without a description', () => {
    td.annot.description = undefined;
    expect(td.annot.update()).rejects.toBeDefined();
  });

  it('can be updated', () => {
    const a = td.annot;
    a.description = 'newdescription';
    return a.update()
      .then((newa) => {
        expect(newa.itemid()).toBeTruthy();
        expect(newa.itemid()).toEqual(a.itemid());
        expect(newa.dataset().itemid()).toBe(td.datasetId);
        expect(newa.file().itemid()).toBe(td.fileId);
        expect(newa.description).toBe(a.description);
        td.annot = newa;
      });
  });

  it('Wont comment without text', () => {
    expect(td.annot.createComment(undefined)).rejects.toBeDefined();
  });

  let annotCommentId;
  it('can be be commented on', () => (
    td.annot.createComment('foo')
      .then((newa) => {
        expect(newa.itemid()).toBeTruthy();
        expect(newa.itemid()).toEqual(td.annot.itemid());
        expect(newa.dataset().itemid()).toBe(td.datasetId);
        expect(newa.file().itemid()).toBe(td.fileId);
        expect(newa.description).toBe(td.annot.description);
        expect(newa.comments).toBeTruthy();
        expect(newa.comments.length).toBeGreaterThan(0);
        expect(newa.comments[0].id).toBeTruthy();
        expect(newa.comments[0].text).toBe('foo');
        td.annot = newa;
        annotCommentId = newa.comments[0].id;
      })
  ));

  it('Wont update comment without id', () => {
    expect(td.annot.updateComment(undefined)).rejects.toBeDefined();
  });

  it('comment can be updated', () => (
    td.annot.updateComment(annotCommentId, 'foo2')
      .then((newa) => {
        expect(newa.itemid()).toBeTruthy();
        expect(newa.itemid()).toEqual(td.annot.itemid());
        expect(newa.dataset().itemid()).toBe(td.datasetId);
        expect(newa.file().itemid()).toBe(td.fileId);
        expect(newa.description).toBe(td.annot.description);
        expect(newa.comments).toBeTruthy();
        expect(newa.comments.length).toBeGreaterThan(0);
        expect(newa.comments[0].id).toBeTruthy();
        expect(newa.comments[0].text).toBe('foo2');
        td.annot = newa;
        annotCommentId = newa.comments[0].id;
      })
  ));

  it('Wont delete comment without id', () => {
    expect(td.annot.deleteComment(undefined)).rejects.toBeDefined();
  });

  it('comment can be deleted', () => (
    td.annot.deleteComment(annotCommentId)
      .then((newa) => {
        expect(newa.itemid()).toBeTruthy();
        expect(newa.itemid()).toEqual(td.annot.itemid());
        expect(newa.dataset().itemid()).toBe(td.datasetId);
        expect(newa.file().itemid()).toBe(td.fileId);
        expect(newa.description).toBe(td.annot.description);
        expect(newa.comments).toBeTruthy();
        expect(newa.comments.length).toBe(0);
        td.annot = newa;
      })
  ));

  it('can be deleted', () => {
    td.annot.delete()
      .then(() => (
        Annotation.load(td.dataset())
      ))
      .then((payload) => {
        expect(payload.filter(a => isEqual(a.id, td.annot.id))).toHaveLength(0);
      });
  });
});

describe('Redux Annotations', () => {
  beforeEach(() => {
    td.store.clearActions();
  });

  describe('annotations', () => {
    it('annotationCreate inserts a new annotation', () => (
      Spaces.dispatchCreate(Annotation.create(td.file(), 'foo', 1, 2, 'ab'))
        .then(() => {
          const actions = td.store.getActions();
          // Now have activity with the annotation create
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_CREATE);
          expect(actions[0].payload).toBeInstanceOf(Annotation);
          expect(actions[0].payload.data).toBe('ab');
          td.annotationCreateAction = actions[0];
          td.annotation = td.annotationCreateAction.payload;
        })
    ));

    it('Annoation.load loads the annotation', () => (
      Spaces.dispatchLoad(Annotation.load(td.dataset()))
        .then(() => {
          const actions = td.store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_LOAD);
          expect(actions[0].payload).toHaveLength(1);
          td.annotationLoadAction = actions[0];
        })
    ));

    it('annotationUpdate updates an annotation', () => {
      td.annotation.description = 'newfoo';
      return Spaces.dispatchUpdate(td.annotation.update())
        .then(() => {
          const actions = td.store.getActions();
          // Now have activity with the annotation create
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_UPDATE);
          expect(actions[0].payload).toBeInstanceOf(Annotation);
          expect(actions[0].payload.description).toBe('newfoo');
          td.annotationUpdateAction = actions[0];
          td.annotation = td.annotationCreateAction.payload;
        });
    });

    it('annotationCommentCreate inserts a new comment', () => (
      Spaces.dispatchUpdate(td.annotation.createComment('foo'))
        .then(() => {
          const actions = td.store.getActions();
          // Now have activity with the annotation create
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_UPDATE);
          expect(actions[0].payload).toBeInstanceOf(Annotation);
          expect(actions[0].payload.comments[0].text).toBe('foo');
          td.annotationCommentCreateAction = actions[0];
          td.annotationCommentId = actions[0].payload.comments[0].id;
        })
    ));

    it('annotationCommentUpdate updates a comment', () => (
      Spaces.dispatchUpdate(td.annotation.updateComment(td.annotationCommentId, 'foo2'))
        .then(() => {
          const actions = td.store.getActions();
          // Now have activity with the annotation create
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_UPDATE);
          expect(actions[0].payload).toBeInstanceOf(Annotation);
          expect(actions[0].payload.comments[0].text).toBe('foo2');
          td.annotationCommentUpdateAction = actions[0];
        })
    ));

    it('annotationCommentDelete deletes a comment', () => (
      Spaces.dispatchUpdate(td.annotation.deleteComment(td.annotationCommentId))
        .then(() => {
          const actions = td.store.getActions();
          // Now have activity with the annotation create
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_UPDATE);
          expect(actions[0].payload).toBeInstanceOf(Annotation);
          expect(actions[0].payload.comments.length).toBe(0);
          td.annotationCommentDeleteAction = actions[0];
        })
    ));

    it('annotationDelete deletes an annotation', () => (
      Spaces.dispatchDelete(td.annotation.delete())
        .then(() => {
          const actions = td.store.getActions();
          // Now have activity with the annotation create
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DIAG_DELETE);
          td.annotationDeleteAction = actions[0];
        })
    ));
  });
});
