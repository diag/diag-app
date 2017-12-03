import {
  SPACES_INIT, SPACE_CREATE, SPACE_UPDATE, SPACE_LOAD, SPACE_SET, DATASET_CREATE, DATASET_LOAD, DATASET_UPDATE, DATASET_SET,
  FILE_CREATE, FILE_LOAD, ANNOTATION_CREATE, ANNOTATION_UPDATE, ANNOTATION_DELETE, ACTIVITY_CREATE, ANNOTATION_COMMENT_CREATE,
  ANNOTATION_COMMENT_UPDATE, ANNOTATION_COMMENT_DELETE,
} from '../actions';
import { createReducer } from '../utils/reducer';
import { handleError } from '../utils/uiutils';
import { Spaces } from '../app';

export const initialState = new Spaces();

const handlers = {
  [SPACES_INIT]: (state, action) => (
    handleError(state, action, () => (
      action.payload
    ))
  ),
  [SPACE_CREATE]: (state, action) => (
    handleError(state, action, () => (
      state.insert(action.payload)
    ))
  ),
  [SPACE_UPDATE]: (state, action) => (
    handleError(state, action, () => (
      state.update(action.payload)
    ))
  ),
  [SPACE_LOAD]: (state, action) => (
    handleError(state, action, () => (
      state.update(action.payload)
    ))
  ),
  [SPACE_SET]: (state, action) => (
    handleError(state, action, () => (
      action.payload
    ))
  ),
  [DATASET_CREATE]: (state, action) => (
    handleError(state, action, () => (
      state.insertDataset(action.payload)
    ))
  ),
  [DATASET_LOAD]: (state, action) => (
    handleError(state, action, () => (
      state.updateDataset(action.payload)
    ))
  ),
  [DATASET_UPDATE]: (state, action) => (
    handleError(state, action, () => (
      state.updateDataset(action.payload)
    ))
  ),
  [DATASET_SET]: (state, action) => (
    handleError(state, action, () => (
      action.payload
    ))
  ),
  [FILE_CREATE]: (state, action) => (
    handleError(state, action, () => (
      state.insertFile(action.payload)
    ))
  ),
  [FILE_LOAD]: (state, action) => (
    handleError(state, action, () => (
      state.updateFile(action.payload)
    ))
  ),
  [ANNOTATION_CREATE]: (state, action) => (
    handleError(state, action, () => (
      state.insertAnnotation(action.payload)
    ))
  ),
  [ANNOTATION_UPDATE]: (state, action) => (
    handleError(state, action, () => (
      state.updateAnnotation(action.payload)
    ))
  ),
  [ANNOTATION_DELETE]: (state, action) => (
    handleError(state, action, () => (
      state.deleteAnnotation(action.payload)
    ))
  ),
  [ANNOTATION_COMMENT_CREATE]: (state, action) => (
    handleError(state, action, () => (
      state.updateAnnotation(action.payload)
    ))
  ),
  [ANNOTATION_COMMENT_UPDATE]: (state, action) => (
    handleError(state, action, () => (
      state.updateAnnotation(action.payload)
    ))
  ),
  [ANNOTATION_COMMENT_DELETE]: (state, action) => (
    handleError(state, action, () => (
      state.updateAnnotation(action.payload)
    ))
  ),
  [ACTIVITY_CREATE]: (state, action) => (
    handleError(state, action, () => (
      state.insertActivity(action.payload)
    ))
  ),
};

export default createReducer(initialState, handlers);
