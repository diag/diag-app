import { Spaces, File } from '../app';
import { parseJSON, baseGet, basePost, basePatch, baseDelete, putOptions, resolveUserId } from '../utils';
import { joinUri } from '../utils';
import * as types from '../typings';

function processResponse(type: string, p: Promise<any>): Promise<types.IAPIPayload> {
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
function run(type: string, funct: Function, url: string, args?: any) {
  return processResponse(type, funct(`${Spaces.apiUrl()}/${type}s/${url}`, args));
}

export function getSpace(sid: string): Promise<types.IAPIPayload> {
  return run('space', baseGet, sid);
}

export function getAllSpaces(): Promise<types.IAPIPayload> {
  return run('space', baseGet, '');
}

/* eslint camelcase: off */
export function postSpace(id: string, name: string, publicSpace: boolean, dataset_cf_schema: any, dataset_cf_uischema: any): Promise<types.IAPIPayload> {
  return run('space', basePost, '', { id, name, public: publicSpace, dataset_cf_schema, dataset_cf_uischema });
}

export function patchSpace(id: string, name: string, dataset_cf_schema: any, dataset_cf_uischema: any, ftr: types.FTR): Promise<types.IAPIPayload> {
  return run('space', basePatch, id, { name, dataset_cf_schema, dataset_cf_uischema, ftr });
}

///// dataset

export function getDatasets(sid: string): Promise<types.IAPIPayload> {
  return run('dataset', baseGet, sid);
}

export function getDataset(sid: string, datasetId: string): Promise<types.IAPIPayload> {
  return run('dataset', baseGet, joinUri(sid, datasetId));
}

export function deleteDataset(sid: string, datasetId: string): Promise<types.IAPIPayload> {
  return run('dataset', baseDelete, joinUri(sid, datasetId));
}

//new API
export function patchDatasetNew(sid: string, datasetId: string, content: any): Promise<types.IAPIPayload> {
  return run('dataset', basePatch, joinUri(sid, datasetId), content);
}

export function postDatasetNew(sid: string, content: any): Promise<types.IAPIPayload> {
  return run('dataset', basePost, sid, content);
}

//deprecated dataset API - use new API, see above
export function postDataset(sid: string, name: string, description: string, tags: string, problem: string, resolution: string, custom: any): Promise<types.IAPIPayload> {
  return postDatasetNew(sid, { name, description, tags, problem, resolution, custom });
}

//deprecated dataset API - use new API, see above
export function patchDataset(sid: string, datasetId: string, name: string, description: string, tags: Array<string>, problem: string, resolution: string, custom: any): Promise<types.IAPIPayload> {
  return patchDatasetNew(sid, datasetId, { name, description, tags, problem, resolution, custom });
}


////// file

export function patchFile(file: File, patchOptions: any): Promise<types.IAPIPayload> {
  const fid = file.id;
  return run('file', basePatch, joinUri(fid.space_id, fid.dataset_id, fid.item_id), patchOptions);
}

export function getFile(sid: string, datasetId: string, fileId: string): Promise<types.IAPIPayload> {
  return run('file', baseGet, joinUri(sid, datasetId, fileId));
}

export function getFiles(sid: string, datasetId: string): Promise<types.IAPIPayload> {
  return run('file', baseGet, joinUri(sid, datasetId));
}

export function uploadFile(sid: string, datasetId: string, name: string, description: string, contentType: string, size: number, content: any): Promise<types.IAPIPayload> {
  const options = putOptions({
    body: content,
  });

  const params = {
    name,
    size,
    content_type: contentType,
  };

  if (description.length > 0) {
    params['description'] = description;
  }

  const query = Object.keys(params)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');

  return processResponse('file', fetch(`${Spaces.apiUrl()}/${joinUri('files', sid, datasetId, 'upload')}?${query}`, options).then(parseJSON));
}


export function getFileContent(sid: string, datasetId: string, fileId: string, options?: any): Promise<any> {
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

export function deleteFile(sid: string, datasetId: string, fileId: string): Promise<types.IAPIPayload> {
  return run('file', baseDelete, joinUri(sid, datasetId, fileId));
}

///// generic CRUD operations

export function getObjects(type: string, uriParts: Array<string>): Promise<types.IAPIPayload> {
  return run(type, baseGet, joinUri(...uriParts));
}

export function deleteObject(type: string, uriParts: Array<string>): Promise<types.IAPIPayload> {
  return run(type, baseDelete, joinUri(...uriParts));
}

export function patchObject(type: string, uriParts: Array<string>, content: any): Promise<types.IAPIPayload> {
  return run(type, basePatch, joinUri(...uriParts), content);
}

export function postObject(type: string, uriParts: Array<string>, content: any): Promise<types.IAPIPayload> {
  return run(type, basePost, joinUri(...uriParts), content);
}