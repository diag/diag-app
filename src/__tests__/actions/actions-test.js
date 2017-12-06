import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { Space, Spaces, Dataset, File, Activity, Annotation } from '../../js/app';
import {
  SPACES_INIT, SPACE_CREATE, SPACE_LOAD, SPACE_UPDATE, SPACE_SET, DATASET_LOAD, DATASET_CREATE, DATASET_SET, DATASET_UPDATE,
  FILE_LOAD, FILE_CREATE, ACTIVITY_CREATE, ANNOTATION_CREATE, ANNOTATION_UPDATE, ANNOTATION_DELETE, ANNOTATION_COMMENT_CREATE,
  ANNOTATION_COMMENT_UPDATE, ANNOTATION_COMMENT_DELETE,
} from '../../js/actions';
import {
  spacesLoad, spaceCreate, spaceUpdate, spaceLoad, datasetCreate, datasetLoad, datasetUpdate,
  fileCreate, fileLoad, activityCreate, annotationCreate, annotationUpdate, annotationDelete,
  setCurrentSpace, setCurrentDataset, annotationCommentCreate, annotationCommentUpdate, annotationCommentDelete,
} from '../../js/actions/spaces';
import reducer, { initialState } from '../../js/reducers/spaces';
import * as tu from '../../js/utils/testutils';
import fetch from 'node-fetch';
import { polyfill as promisePolyfill } from 'es6-promise';

global.fetch = fetch;

promisePolyfill();

jasmine.DEFAULT_TIMEOUT_INTERVAL = 15000;

const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

const TID = tu.getTID();
const spaceId = `space${TID}`;

const store = mockStore({ spaces: initialState });

let spaceCreateAction;
let spaceCreateErrorAction;
let spaceUpdateAction;
let spacesInitAction;
let spaceLoadAction;
let datasetCreateAction;
let datasetCreateErrorAction;
let datasetUpdateAction;
let datasetLoadAction;
let fileCreateErrorAction;
let fileCreateAction;
let fileLoadAction;
let activityCreateErrorAction;
let activityCreateAction;
let annotationCreateErrorAction;
let annotationCreateAction;
let annotationUpdateAction;
let annotationCommentCreateAction;
let annotationCommentUpdateAction;
let annotationCommentDeleteAction;
let annotationDeleteAction;
let setCurrentSpaceErrorAction;
let setCurrentSpaceAction;
let setCurrentDatasetErrorAction;
let setCurrentDatasetAction;

let space;
let dataset;
let file;
let activity;
let annotation;

let interimState;

beforeAll(() => (tu.testSetup('action-test', TID)));
afterAll(() => (tu.testTearDown('action-test')));

describe('Redux Spaces', () => {
  beforeEach(() => {
    store.clearActions();
  });

  describe('actions', () => {
    it('spaceCreate errors', () => (
      store.dispatch(spaceCreate('foo_bar'))
        .catch(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(SPACE_CREATE);
          expect(actions[0].error).toBeTruthy();
          expect(actions[0].status).toBe(400);
          spaceCreateErrorAction = actions[0];
        })
    ));
    it('spaceCreate inserts a new space', () => (
      store.dispatch(spaceCreate(spaceId))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(SPACE_CREATE);
          expect(actions[0].payload).toBeInstanceOf(Space);
          expect(actions[0].payload.itemid()).toBe(spaceId);
          spaceCreateAction = actions[0];
          space = spaceCreateAction.payload;
        })
    ));
    it('spaceUpdate updates a space', () => {
      space.name = `${space.name}_updated`;
      return store.dispatch(spaceUpdate(space))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(SPACE_UPDATE);
          expect(actions[0].payload).toBeInstanceOf(Space);
          expect(actions[0].payload.itemid()).toBe(spaceId);
          spaceUpdateAction = actions[0];
          space = spaceUpdateAction.payload;
        });
    });
    it('waits', (done) => {
      setTimeout(done, 1000);
    });
    it('spacesLoad downloads all spaces', () => (
      store.dispatch(spacesLoad())
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(SPACES_INIT);
          expect(actions[0].payload).toBeInstanceOf(Spaces);
          expect(actions[0].payload.space(spaceId)).toBeTruthy();
          spacesInitAction = actions[0];
        })
    ));
  });

  describe('reducer', () => {
    it('should return the initial state', () => {
      expect(reducer(initialState, undefined)).toEqual(initialState);
    });

    it('should handle spaceCreate error', () => {
      expect(reducer(initialState, spaceCreateErrorAction))
        .toEqual({
          error: spaceCreateErrorAction.error,
          status: spaceCreateErrorAction.status,
          ...new Spaces(undefined),
        });
    });

    it('should handle spaceCreate', () => {
      expect(reducer(initialState, spaceCreateAction))
        .toEqual(initialState.insert(spaceCreateAction.payload));
    });

    it('should handle spaceUpdate', () => {
      expect(reducer(initialState, spaceUpdateAction))
        .toEqual(initialState.update(spaceUpdateAction.payload));
    });

    it('should handle spacesLoad', () => {
      expect(reducer(initialState, spacesInitAction))
        .toEqual(spacesInitAction.payload);

      interimState = spacesInitAction.payload;
    });
  });
});

describe('Redux Datasets', () => {
  beforeEach(() => {
    store.clearActions();
  });

  describe('actions', () => {
    it('datasetCreate errors', () => {
      const name = '0'.repeat(100);
      return store.dispatch(datasetCreate(space, name, 'foo', undefined))
        .catch(() => {
        })
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DATASET_CREATE);
          expect(actions[0].error).toBeTruthy();
          expect(actions[0].status).toBe(400);
          datasetCreateErrorAction = actions[0];
        });
    });

    it('datasetCreate inserts a new dataset', () => (
      store.dispatch(datasetCreate(space, tu.dataset1orig.name, tu.dataset1orig.description, tu.dataset1orig.tags, tu.dataset1orig.problem, tu.dataset1orig.resolution))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DATASET_CREATE);
          expect(actions[0].payload).toBeInstanceOf(Dataset);
          expect(actions[0].payload).toMatchObject(tu.dataset1orig);
          datasetCreateAction = actions[0];
          dataset = datasetCreateAction.payload;
        })
    ));

    it('datasetUpdate updates a dataset', () => {
      dataset.name = `${dataset.name}_updated`;
      dataset.description = `${dataset.description}_updated`;
      dataset.problem = `${dataset.problem}_updated`;
      dataset.resolution = `${dataset.resolution}_updated`;
      dataset.tags.push('updated');
      return store.dispatch(datasetUpdate(dataset))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(DATASET_UPDATE);
          expect(actions[0].payload).toBeInstanceOf(Dataset);
          expect(actions[0].payload).toMatchObject(dataset);
          datasetUpdateAction = actions[0];
          dataset = datasetUpdateAction.payload;
        });
    });

    it('spaceLoad reloads the space', () => (
      store.dispatch(spaceLoad(space))
        .then(() => {
          const actions = store.getActions();
          expect(actions).toHaveLength(1);
          expect(actions[0].type).toBe(SPACE_LOAD);
          expect(actions[0].payload).toBeInstanceOf(Space);
          expect(actions[0].payload.dataset(dataset.itemid()).name).toBe(dataset.name);
          spaceLoadAction = actions[0];
          space = spaceLoadAction.payload;
        })
    ));
  });

  describe('reducer', () => {
    it('should handle the datasetCreate error', () => {
      expect(reducer(interimState, datasetCreateErrorAction))
        .toEqual({
          error: datasetCreateErrorAction.error,
          status: datasetCreateErrorAction.status,
          ...interimState,
        });
    });

    it('should handle datasetCreate', () => {
      expect(reducer(interimState, datasetCreateAction))
        .toEqual(interimState.insertDataset(datasetCreateAction.payload));
    });

    it('should handle spaceLoad', () => {
      expect(reducer(interimState, spaceLoadAction))
        .toEqual(interimState.update(spaceLoadAction.payload));

      interimState = interimState.update(spaceLoadAction.payload);
    });

    it('should handle datasetUpdate', () => {
      expect(reducer(interimState, datasetUpdateAction))
        .toEqual(interimState.updateDataset(datasetUpdateAction.payload));
    });

    it('should handle datasetLoad', () => {
      expect(reducer(interimState, datasetLoadAction))
        .toEqual(interimState.updateDataset(datasetLoadAction.payload));
    });
  });

  // describe('Redux Spaces, current Space & Dataset', () => {
  //   beforeEach(() => {
  //     store.clearActions();
  //   });
  //   describe('actions', () => {
  //     it('setCurrentSpace errors', () => {
  //       store.dispatch(setCurrentSpace('foo'))
  //         .catch((err) => {
  //           expect(err.status).toBe(404);
  //         });
  //     });
  //     it('setCurrentSpace dispatches', () => {
  //       store.dispatch(setCurrentSpace(space))
  //         .then(() => {
  //           const actions = store.getActions();
  //           expect(actions).toHaveLength(1);
  //           expect(actions[0].type).toBe(SPACE_SET);
  //           expect(actions[0].payload).toBe(space.itemid());
  //           setCurrentSpaceAction = actions[0];
  //         });
  //     });

  //     it('setCurrentDataset errors', () => {
  //       store.dispatch(setCurrentDataset('foo'))
  //         .catch((err) => {
  //           expect(err).toMatch('invalid current space');
  //         });
  //     });

  //     it('setCurrentDataset dispatches', () => {
  //       store.dispatch(setCurrentDataset(dataset))
  //         .then(() => {
  //           expect(false).toBeTruthy();
  //           const actions = store.getActions();
  //           console.log(actions);
  //           expect(actions).toHaveLength(2);
  //           expect(actions[0].type).toBe(DATASET_SET);
  //           expect(actions[0].payload).toBe(dataset.itemid());
  //           setCurrentDatasetAction = actions[0];
  //         });
  //     });
  //   });

  //   describe('reducer', () => {
  //     it('should handle the setCurrentSpace error', () => {
  //       expect(reducer(interimState, setCurrentSpaceErrorAction))
  //         .toEqual({
  //           error: setCurrentSpaceErrorAction.error,
  //           spaces: interimState.spaces,
  //         });
  //     });
  //     it('should handle setCurrentSpace', () => {
  //       expect(reducer(interimState, setCurrentSpaceAction))
  //         .toEqual({
  //           spaces: setCurrentSpaceAction.payload
  //         });
  //     });
  //     it('should handle the setCurrentDataset error', () => {
  //       expect(reducer(interimState, setCurrentDatasetErrorAction))
  //         .toEqual({
  //           error: setCurrentDatasetErrorAction.error,
  //           spaces: interimState.spaces,
  //         });
  //     });
  //     it('should handle setCurrentDataset', () => {
  //       expect(reducer(interimState, setCurrentDatasetAction))
  //         .toEqual({
  //           spaces: setCurrentDatasetAction.payload
  //         });
  //     });
  //   });
  // });
});
