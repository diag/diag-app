import { Spaces } from '../app';
import { parseJSON, baseGet, basePost, basePatch, baseDelete, putOptions, resolveUserId } from '../utils/apiutils';

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

export function postSpace(id, name) {
  return run('space', basePost, '', { id, name });
}

export function patchSpace(id, name) {
  return run('space', basePatch, id, { name });
}

///// dataset

export function getDatasets(sid) {
  return run('dataset', baseGet, sid);
}

export function getDataset(sid, datasetId) {
  return run('dataset', baseGet, `${sid}/${datasetId}`);
}

export function postDataset(sid, name, description, tags, problem, resolution) {
  return run('dataset', basePost, sid, { name, description, tags, problem, resolution });
}

export function patchDataset(sid, datasetId, name, description, tags, problem, resolution) {
  return run('dataset', basePatch, `${sid}/${datasetId}`, { name, description, tags, problem, resolution });
}

export function deleteDataset(sid, datasetId) {
  return run('dataset', baseDelete, `${sid}/${datasetId}`);
}


////// file

export function patchFile(file, patchOptions) {
  const fid = file.id;
  return run('file', basePatch, `${fid.space_id}/${fid.dataset_id}/${fid.item_id}`, patchOptions);
}

export function getFile(sid, datasetId, fileId) {
  return run('file', baseGet, `${sid}/${datasetId}/${fileId}`);
}

export function getFiles(sid, datasetId) {
  return run('file', baseGet, `${sid}/${datasetId}`);
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

  return processResponse('file', fetch(`${Spaces.apiUrl()}/files/${sid}/${datasetId}/upload?${query}`, options).then(parseJSON));
}


export function getFileContent(sid, datasetId, fileId, options) {
  if (options === undefined) {
    options = {};
  }
  return baseGet(`${Spaces.apiUrl()}/files/${sid}/${datasetId}/${fileId}/download_url`)
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
  return run('file', baseDelete, `${sid}/${datasetId}/${fileId}`);
}
