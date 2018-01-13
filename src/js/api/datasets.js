import { Spaces } from '../app';
import { parseJSON, baseGet, basePost, basePatch, baseDelete, putOptions, resolveUserId } from '../utils/apiutils';
import { joinUri } from '../utils';

function processResponse(type, p) {
  return p.then(resolveUserId)
    .then(payload => {
      payload.items.forEach(a => { a.id.type = type; });
      return payload;
    });
}

/**
 * run runs a query against the API
 * @param {type} string - Type of object, (space|dataset|file|activity)
 * @param {func} funct - Function to use to execute the query, baseGet|basePost|basePatch|baseDelete
 * @param {string} url - URL to query
 * @param {object} args - Arguments for the POST or PATCH body
 */
function run(type, funct, url, args) {
  return processResponse(type, funct(`${Spaces.apiUrl()}/${type}s/${url}`, args));
}

export function getSpace(sid) {
  return run('space', baseGet, sid);
}

export function getAllSpaces() {
  return run('space', baseGet, '');
}

/* eslint camelcase: off */
export function postSpace(id, name, publicSpace, dataset_cf_schema, dataset_cf_uischema) {
  return run('space', basePost, '', { id, name, public: publicSpace, dataset_cf_schema, dataset_cf_uischema });
}

export function patchSpace(id, name, dataset_cf_schema, dataset_cf_uischema) {
  return run('space', basePatch, id, { name, dataset_cf_schema, dataset_cf_uischema });
}

///// dataset

export function getDatasets(sid) {
  return run('dataset', baseGet, sid);
}

export function getDataset(sid, datasetId) {
  return run('dataset', baseGet, joinUri(sid, datasetId));
}

export function deleteDataset(sid, datasetId) {
  return run('dataset', baseDelete, joinUri(sid, datasetId));
}

//new API
export function patchDatasetNew(sid, datasetId, content) {
  return run('dataset', basePatch, joinUri(sid, datasetId), content);
}

export function postDatasetNew(sid, content) {
  return run('dataset', basePost, sid, content);
}

//deprecated dataset API - use new API, see above
export function postDataset(sid, name, description, tags, problem, resolution, custom) {
  return postDatasetNew(sid, {name, description, tags, problem, resolution, custom });
}

//deprecated dataset API - use new API, see above
export function patchDataset(sid, datasetId, name, description, tags, problem, resolution, custom) {
  return patchDatasetNew(sid, datasetId, { name, description, tags, problem, resolution, custom });
}


////// file

export function patchFile(file, patchOptions) {
  const fid = file.id;
  return run('file', basePatch, joinUri(fid.space_id,  fid.dataset_id, fid.item_id), patchOptions);
}

export function getFile(sid, datasetId, fileId) {
  return run('file', baseGet, joinUri(sid, datasetId, fileId));
}

export function getFiles(sid, datasetId) {
  return run('file', baseGet, joinUri(sid, datasetId));
}

export function uploadFile(sid, datasetId, name, description, contentType, size, content) {
  const options = putOptions({
    body: content,
  });

  const params = {
    name,
    size,
    content_type: contentType,
  };

  if (description.length > 0) {
    params.description = description;
  }

  const query = Object.keys(params)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');

  return processResponse('file', fetch(`${Spaces.apiUrl()}/${joinUri('files', sid, datasetId, 'upload')}?${query}`, options).then(parseJSON));
}


export function getFileContent(sid, datasetId, fileId, options) {
  if (options === undefined) {
    options = {};
  }
  return baseGet(`${Spaces.apiUrl()}/${joinUri('files', sid, datasetId, fileId, 'download_url')}`)
    .then((payload) => {
      const downloadOptions = {
        headers: payload.http_headers,
        method: payload.http_method,
        credentials: 'same-origin',
        ...options,
      };
      return fetch(payload.signed_url, downloadOptions);
    });
}

export function deleteFile(sid, datasetId, fileId) {
  return run('file', baseDelete, joinUri(sid, datasetId, fileId));
}
