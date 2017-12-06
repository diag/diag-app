import {
  SPACE_LOAD, SPACE_SET, DATASET_SET,
  DIAG_CREATE, DIAG_LOAD, DIAG_UPDATE, DIAG_DELETE
} from '../actions';
import { Spaces, Space, Dataset, File, Annotation, Activity } from '../app';
import { promiseDispatch, promiseDispatchWithActivity, dispatchError } from '../utils/uiutils';

/* eslint import/prefer-default-export: off */

/**
 * Creates a new space
 * @param {string} id
 * @param {string} name
 */
export function spaceCreate(id, name) {
  return Spaces.dispatchCreate(Space.create(id, name));
}

/**
 * Updates a space
 * @param {Space} space
 */
export function spaceUpdate(space) {
  return Spaces.dispatchUpdate(space.update());
}

/**
 * Loads a space from the API
 * @param {Space} spaceId
 */
export function spaceLoad(spaceId) {
  return (dispatch) => {
    return _spaceLoad(spaceId, dispatch);
  };
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
  return Spaces.dispatchCreate(Dataset.create(space, name, description, tags, problem, resolution));
}

/**
 * Loads a dataset from the API
 * @param {string} spaceId
 * @param {string} datasetId
 */
export function datasetLoad(spaceId, datasetId) {
  return (dispatch, getStore) => {
    _datasetLoad(spaceId, datasetId, dispatch, getStore);
  };
}

function _datasetLoad(spaceId, datasetId, dispatch) {
  let dataset;
  return Dataset.load(spaceId, datasetId)
    .then((d) => { dataset = d; return Spaces.dispatchLoad(File.load(dataset)); })
    .then(() => Spaces.dispatchLoad(Annotation.load(dataset)))
    .then(() => Spaces.dispatchLoad(dataset.index()))
    .catch((error) => {
      if (error !== 'Empty result set') {
        return dispatchError(error, dispatch, DIAG_LOAD);
      }
    });
}

function _spaceLoad(spaceId, dispatch) {
  let space;
  return Spaces.dispatchLoad(Space.load(spaceId))
    .then((s) => { space = s; return Spaces.dispatchLoad(Activity.load(space)); })
    // TODO Move this to Spaces.dispatchLoad
    .catch((error) => {
      if (error !== 'Empty result set') {
        return dispatchError(error, dispatch, DIAG_LOAD);
      }
    });
}

/**
 * Updates a dataset with the API
 * @param {Dataset} dataset
 */
export function datasetUpdate(dataset) {
  return Space.dispatchUpdate(dataset.update());
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
  return Spaces.dispatchCreate(File.create(dataset, name, description, contentType, size, content))
    .then((f) => (Spaces.dispatchCreate(Activity.create(f, 'upload', { name: f.name, id: f.id }))));
}

/**
 * Loads a file from the API
 * @param {File} file
 */
export function fileLoad(file) {
  return Spaces.dispatchUpdate(file.load());
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
    DIAG_CREATE, (payload) => (Activity.create(file, 'annotation', { id: payload.id, description: payload.description })));
}

/**
 * Update an annotation in the API
 * @param {Annotation} annotation
 */
export function annotationUpdate(annotation) {
  return promiseDispatchWithActivity(() => (annotation.update()),
    DIAG_UPDATE, (payload) => (Activity.create(payload.file(), 'annotation', { id: payload.id, description: payload.description })));
}

/**
 * Adds a comment to an annotation in the API
 * @param {Annotation} annotation
 * @param {string} text
 */
export function annotationCommentCreate(annotation, text) {
  return promiseDispatchWithActivity(() => (annotation.createComment(text)),
    DIAG_UPDATE, (payload) => (Activity.create(payload.file(), 'comment', { id: payload.id, description: text })));
}

/**
 * Updates a comment on an annotation in the API (does not log activity because we already logged it under the last text and we can't update there)
 * @param {Annotation} annotation
 * @param {string} id
 * @param {string} text
 */
export function annotationCommentUpdate(annotation, id, text) {
  return promiseDispatch(() => (annotation.updateComment(id, text)), DIAG_UPDATE);
}

/**
 * Deletes a comment on an annotation in the API
 * @param {Annotation} annotation
 * @param {string} id
 */
export function annotationCommentDelete(annotation, id) {
  return promiseDispatch(() => (annotation.deleteComment(id)), DIAG_UPDATE);
}

/**
 * Delete an annotation in the API
 * @param {Annotation}
 */
export function annotationDelete(annotation) {
  return promiseDispatch(() => (annotation.delete()), DIAG_DELETE);
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
  ), DIAG_CREATE);
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
    _spaceLoad(getStore().spaces.currentSpace().itemid())
  );
}

/**
 * Loads the current dataset from the API
 */
export function currentDatasetLoad() {
  return (dispatch, getStore) => {
    const spaceId = getStore().spaces.currentDataset().space().itemid();
    const datasetId = getStore().spaces.currentDataset().dataset().itemid();
    return _datasetLoad(spaceId, datasetId, dispatch, getStore);
  };
}
