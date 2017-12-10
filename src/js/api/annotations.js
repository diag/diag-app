import { Spaces } from '../app';
import { baseGet, basePost, baseDelete, basePatch, resolveUserId } from '../utils/apiutils';

function processResponse(p) {
  return p.then(resolveUserId)
    .then(payload => {
      const promises = payload.items.map(a => {
        a.id.type = 'annotation';
        const resolvePayload = Object.assign({}, { items: [...a.comments] });
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
function run(funct, url, args) {
  return processResponse(funct(`${Spaces.apiUrl()}/annotations/${url}`, args));
}

export function getAnnotations(sid, datasetId, fileId) {
  return run(baseGet, `${sid}/${datasetId}/${fileId}`);
}

export function getAllAnnotations(sid, datasetId) {
  return run(baseGet, `${sid}/${datasetId}`);
}

export function patchAnnotation(sid, datasetId, fileId, annoId, description) {
  return run(basePatch, `${sid}/${datasetId}/${fileId}/${annoId}`, { description });
}

export function deleteAnnotation(sid, datasetId, fileId, annoId) {
  return run(baseDelete, `${sid}/${datasetId}/${fileId}/${annoId}`);
}

export function postAnnotation(sid, datasetId, fileId, offset, length, description, data) {
  const options = { offset, length, description, data };
  return run(basePost, `${sid}/${datasetId}/${fileId}`, options);
}

export function postAnnotationComment(sid, datasetId, fileId, annotationId, text) {
  return run(basePost, `${sid}/${datasetId}/${fileId}/${annotationId}/comments`, { text });
}

export function patchAnnotationComment(sid, datasetId, fileId, annotationId, commentId, text) {
  return run(basePatch, `${sid}/${datasetId}/${fileId}/${annotationId}/comments/${commentId}`, { text });
}

export function deleteAnnotationComment(sid, datasetId, fileId, annotationId, commentId) {
  return run(baseDelete, `${sid}/${datasetId}/${fileId}/${annotationId}/comments/${commentId}`);
}
