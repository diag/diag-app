import { Spaces } from '../app';
import { baseGet, basePost, baseDelete, basePatch, resolveUserId } from '../utils';
import * as types from '../typings';

function processResponse(p: Promise<any>): Promise<types.IAPIPayload> {
  return p.then(resolveUserId)
    .then(payload => {
      const promises = payload.items.map(a => {
        a.id.type = 'annotation';
        const resolvePayload = Object.assign({}, { count: a.comments.length, items: [...a.comments] });
        return resolveUserId(resolvePayload, 'owner', 'owner_info')
          .then((newPayload) => {
            a.comments = [...newPayload.items];
          });
      });
      return Promise.all(promises)
        .then(() => {
          return Promise.resolve(payload);
        });
    });
}

/**
 * run runs a query against the API
 * @param {func} funct - Function to use to execute the query, baseGet|basePost|basePatch|baseDelete
 * @param {string} url - URL to query
 * @param {object} args - Arguments for the POST or PATCH body
 */
function run(funct: Function, url: string, args?: any): Promise<types.IAPIPayload> {
  return processResponse(funct(`${Spaces.apiUrl()}/annotations/${url}`, args));
}

export function getAnnotations(sid: string, datasetId: string, fileId: string): Promise<types.IAPIPayload> {
  return run(baseGet, `${sid}/${datasetId}/${fileId}`);
}

export function getAllAnnotations(sid: string, datasetId: string): Promise<types.IAPIPayload> {
  return run(baseGet, `${sid}/${datasetId}`);
}

export function patchAnnotation(sid: string, datasetId: string, fileId: string, annoId: string, description:string): Promise<types.IAPIPayload> {
  return run(basePatch, `${sid}/${datasetId}/${fileId}/${annoId}`, { description });
}

export function deleteAnnotation(sid: string, datasetId: string, fileId: string, annoId: string) {
  return run(baseDelete, `${sid}/${datasetId}/${fileId}/${annoId}`);
}

export function postAnnotation(sid: string, datasetId: string, fileId: string, offset: number, length: number, description: string, data: any): Promise<types.IAPIPayload> {
  const options = { offset, length, description, data };
  return run(basePost, `${sid}/${datasetId}/${fileId}`, options);
}

export function postAnnotationComment(sid: string, datasetId: string, fileId: string, annotationId: string, text: string): Promise<types.IAPIPayload> {
  return run(basePost, `${sid}/${datasetId}/${fileId}/${annotationId}/comments`, { text });
}

export function patchAnnotationComment(sid: string, datasetId: string, fileId: string, annotationId: string, commentId: string, text: string): Promise<types.IAPIPayload> {
  return run(basePatch, `${sid}/${datasetId}/${fileId}/${annotationId}/comments/${commentId}`, { text });
}

export function deleteAnnotationComment(sid: string, datasetId: string, fileId: string, annotationId: string, commentId: string): Promise<types.IAPIPayload> {
  return run(baseDelete, `${sid}/${datasetId}/${fileId}/${annotationId}/comments/${commentId}`);
}
