import { Spaces } from '../app';
import * as types from '../typings';
import { baseGet, basePost, resolveUserId } from '../utils';

function processResponse(p: Promise<any>): Promise<any> {
  return p.then(resolveUserId)
    .then(payload => {
      payload.items.forEach(a => { a.id.type = 'activity'; });
      return payload;
    });
}

function run(funct: Function, url: string, args?: any) {
  return processResponse(funct(`${Spaces.apiUrl()}/activity/${url}`, args));
}


/**
 * Gets activity for a space
 * @param {string} sid - Space ID
 * @returns {Promise}
 */
export function getSpaceActivity(sid: string): Promise<types.IAPIPayload> {
  return run(baseGet, sid);
}

/**
 * Creates new activity for a space
 * @param {string} sid - Space ID
 * @param {string} type - Type, search|upload|annotation for now
 * @param {object} data - Full data of the activity. Should contain at minimum the ID object of what the activity references.
 * @returns {Promise}
 */
export function postSpaceActivity(sid: string, type: types.ActivityType, data: any): Promise<types.IAPIPayload> {
  return run(basePost, sid, { type, data });
}

/**
 * Gets activity for a dataset
 * @param {string} sid - Space ID
 * @param {string} datasetId - Dataset ID
 * @returns {Promise}
 */
export function getDatasetActivity(sid: string, datasetId: string): Promise<types.IAPIPayload> {
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
export function postDatasetActivity(sid: string, datasetId: string, type: types.ActivityType, data: any): Promise<types.IAPIPayload> {
  return run(basePost, `${sid}/${datasetId}`, { type, data });
}

/**
 * Returns activity for a given file
 * @param {string} sid - Space ID
 * @param {string} datasetId - Dataset ID
 * @param {string} fileId - File ID
 * @returns {Promise}
 */
export function getFileActivity(sid: string, datasetId: string, fileId: string): Promise<types.IAPIPayload> {
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
export function postFileActivity(sid: string, datasetId: string, fileId: string, type: types.ActivityType, data: any) {
  return run(basePost, `${sid}/${datasetId}/${fileId}`, { type, data });
}
