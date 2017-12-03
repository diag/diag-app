import {
  SPACES_INIT, SPACE_CREATE, SPACE_LOAD, SPACE_UPDATE, SPACE_SET, DATASET_LOAD, DATASET_CREATE, DATASET_UPDATE, DATASET_SET,
  FILE_LOAD, FILE_CREATE, ANNOTATION_CREATE, ANNOTATION_UPDATE, ANNOTATION_DELETE, ACTIVITY_CREATE, ANNOTATION_COMMENT_CREATE,
  ANNOTATION_COMMENT_UPDATE, ANNOTATION_COMMENT_DELETE,
} from '../actions';
import { Spaces, Space, Dataset, File, Annotation, Activity } from '../app';
import { promiseDispatch, promiseDispatchWithActivity, dispatchError } from '../utils/uiutils';

/* eslint import/prefer-default-export: off */

/**
 * Load spaces
 * @param {errorAction} object - Action to dispatch upon completion
 */
export function spacesLoad(errorAction) {
  return promiseDispatch(() => (Spaces.load()),
    SPACES_INIT, undefined,
    dispatch => { if (errorAction) dispatch(errorAction); }
  );
}

/**
 * Creates a new space
 * @param {string} id
 * @param {string} name
 */
export function spaceCreate(id, name) {
  return promiseDispatch(() => (Space.create(id, name)), SPACE_CREATE);
}

/**
 * Updates a space
 * @param {Space} space
 */
export function spaceUpdate(space) {
  return promiseDispatch(() => (space.update()), SPACE_UPDATE);
}

/**
 * Loads a space from the API
 * @param {Space} space
 */
export function spaceLoad(space) {
  return promiseDispatch(() => (space.load()), SPACE_LOAD);
}

/**
 * Creates a dataset in the API
 * @param {Space} space
 * @param {string} name
 * @param {string} description
 * @param {string[]} tags
 * @param {string} problem
 * @param {string} resolution
 */
export function datasetCreate(space, name, description, tags, problem, resolution) {
  return promiseDispatch(() => (
    Dataset.create(space, name, description, tags, problem, resolution)
  ), DATASET_CREATE);
}

/**
 * Loads a dataset from the API
 * @param {Dataset} dataset
 */
export function datasetLoad(dataset) {
  return promiseDispatch(() => (dataset.load()), DATASET_LOAD);
}

/**
 * Updates a dataset with the API
 * @param {Dataset} dataset
 */
export function datasetUpdate(dataset, options) {
  return promiseDispatch(() => (dataset.update(options)), DATASET_UPDATE);
}

/**
 * Creates a file in the API
 * @param {Dataset} dataset
 * @param {string} name
 * @param {string} description
 * @param {string} contentType
 * @param {number} size
 * @param {string} content
 */
export function fileCreate(dataset, name, description, contentType, size, content) {
  return dispatch => (
    File.create(dataset, name, description, contentType, size, content)
      .catch((error) => {
        return dispatchError(error, dispatch, FILE_CREATE);
      })
      .then((f) => {
        dispatch({ type: FILE_CREATE, payload: f });
        return Activity.create(f, 'upload', { name: f.name, id: f.id })
          .then((a) => {
            dispatch({ type: ACTIVITY_CREATE, payload: a });
            return Promise.resolve();
          })
          .catch((error) => {
            return dispatchError(error, dispatch, ACTIVITY_CREATE);
          });
      })
  );
}

/**
 * Loads a file from the API
 * @param {File} file
 */
export function fileLoad(file) {
  return promiseDispatch(() => (file.load()), FILE_LOAD);
}

/**
 * Creates an annotation in the API
 * @param {File} file
 * @param {string} description
 * @param {number} offset
 * @param {number} length
 * @param {string} data
 */
export function annotationCreate(file, description, offset, length, data) {
  return promiseDispatchWithActivity(() => (Annotation.create(file, description, offset, length, data)),
    ANNOTATION_CREATE, (payload) => (Activity.create(file, 'annotation', { id: payload.id, description: payload.description })));
}

/**
 * Update an annotation in the API
 * @param {Annotation} annotation
 */
export function annotationUpdate(annotation) {
  return promiseDispatchWithActivity(() => (annotation.update()),
    ANNOTATION_UPDATE, (payload) => (Activity.create(payload.file(), 'annotation', { id: payload.id, description: payload.description })));
}

/**
 * Adds a comment to an annotation in the API
 * @param {Annotation} annotation
 * @param {string} text
 */
export function annotationCommentCreate(annotation, text) {
  return promiseDispatchWithActivity(() => (annotation.createComment(text)),
    ANNOTATION_COMMENT_CREATE, (payload) => (Activity.create(payload.file(), 'comment', { id: payload.id, description: text })));
}

/**
 * Updates a comment on an annotation in the API (does not log activity because we already logged it under the last text and we can't update there)
 * @param {Annotation} annotation
 * @param {string} id
 * @param {string} text
 */
export function annotationCommentUpdate(annotation, id, text) {
  return promiseDispatch(() => (annotation.updateComment(id, text)), ANNOTATION_COMMENT_UPDATE);
}

/**
 * Deletes a comment on an annotation in the API
 * @param {Annotation} annotation
 * @param {string} id
 */
export function annotationCommentDelete(annotation, id) {
  return promiseDispatch(() => (annotation.deleteComment(id)), ANNOTATION_COMMENT_DELETE);
}

/**
 * Delete an annotation in the API
 * @param {Annotation}
 */
export function annotationDelete(annotation) {
  return promiseDispatch(() => (annotation.delete()), ANNOTATION_DELETE);
}

/**
 * Creates activity in the API
 * @param {(Space|Dataset|File)} parent
 * @param {string} type
 * @param {string} data
 */
export function activityCreate(parent, type, data) {
  return promiseDispatch(() => (
    Activity.create(parent, type, data)
  ), ACTIVITY_CREATE);
}

//
// Below here are currently not unit testable due to lacking getStore() support in redux-mock-store
//

/**
 * Sets current Space
 * @param {(Space|string)} space - Space object or space ID
 */
export function setCurrentSpace(space) {
  return promiseDispatch((_, getStore) => (getStore().spaces.setCurrentSpace(space)), SPACE_SET);
}

/**
 * Sets current Dataset
 * @param {(Dataset|string)} dataset - Dataset object or Dataset ID
 */
export function setCurrentDataset(dataset) {
  return promiseDispatch((_, getStore) => (getStore().spaces.setCurrentDataset(dataset)), DATASET_SET);
}

/**
 * Loads the current Space from the API
 */
export function currentSpaceLoad() {
  return (dispatch, getStore) => (
    getStore().spaces.currentSpace().load()
      .then((payload) => {
        dispatch({ type: SPACE_LOAD, payload });
      })
      .catch((error) => {
        if (error !== 'Empty result set') {
          return dispatchError(error, dispatch, SPACE_LOAD);
        }
      })
  );
  // return promiseDispatch((_, getStore) => (getStore().spaces.currentSpace().load()), SPACE_LOAD);
}

/**
 * Loads the current dataset from the API
 */
export function currentDatasetLoad() {
  return promiseDispatch((_, getStore) => (getStore().spaces.currentDataset().load()), DATASET_LOAD);
}
