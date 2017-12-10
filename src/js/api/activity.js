import { Spaces } from '../app';
import { baseGet, basePost, resolveUserId } from '../utils/apiutils';

function processResponse(p) {
  return p.then(resolveUserId)
    .then(payload => {
      payload.items.forEach(a => { a.id.type = 'activity'; });
      return payload;
    });
}

function run(funct, url, args) {
  return processResponse(funct(`${Spaces.apiUrl()}/activity/${url}`, args));
}


/**
 * Gets activity for a space
 * @param {string} sid - Space ID
 * @returns {Promise}
 */
export function getSpaceActivity(sid) {
  return run(baseGet, sid);
}

/**
 * Creates new activity for a space
 * @param {string} sid - Space ID
 * @param {string} type - Type, search|upload|annotation for now
 * @param {object} data - Full data of the activity. Should contain at minimum the ID object of what the activity references.
 * @returns {Promise}
 */
export function postSpaceActivity(sid, type, data) {
  return run(basePost, sid, { type, data });
}

/**
 * Gets activity for a dataset
 * @param {string} sid - Space ID
 * @param {string} datasetId - Dataset ID
 * @returns {Promise}
 */
export function getDatasetActivity(sid, datasetId) {
  return run(baseGet, `${sid}/${datasetId}`);
}

/**
 * Creates new activity for a dataset
 * @param {*} sid - Space ID
 * @param {*} datasetId - DatasetID
 * @param {*} type - Type, search|upload|annotation for now
 * @param {object} data - Full data of the activity. Should contain at minimum the ID object of what the activity references.
 * @returns {Promise}
 */
export function postDatasetActivity(sid, datasetId, type, data) {
  return run(basePost, `${sid}/${datasetId}`, { type, data });
}

/**
 * Returns activity for a given file
 * @param {string} sid - Space ID
 * @param {string} datasetId - Dataset ID
 * @param {string} fileId - File ID
 * @returns {Promise}
 */
export function getFileActivity(sid, datasetId, fileId) {
  return run(baseGet, `${sid}/${datasetId}/${fileId}`);
}

/**
 * Posts file activity to API
 * @param {string} sid - Space ID
 * @param {string} datasetId - Dataset ID
 * @param {string} fileId - File ID
 * @param {string} type - Type, search|upload|annotation for now
 * @param {Object} data - Full data of the activity. Should contain at minimum the ID object of what the activity references.
 * @returns {Promise}
 */
export function postFileActivity(sid, datasetId, fileId, type, data) {
  return run(basePost, `${sid}/${datasetId}/${fileId}`, { type, data });
}
