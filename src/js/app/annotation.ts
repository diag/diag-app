import { postAnnotation, patchAnnotation, deleteAnnotation, postAnnotationComment, patchAnnotationComment,
  deleteAnnotationComment, getAllAnnotations } from '../api/annotations';
import { checkEmpty, simpleObjectReturn } from '../utils/apputils';
import Spaces from './spaces';
import Dataset from './dataset';
import File from './file';
import Base from './base';
import * as types from '../typings';

/** Annotations on files */
export default class Annotation extends Base implements types.IAnnotation {
  id: types.id;
  description: string;
  offset: number;
  length: number;
  data: any;
  extra: any;

  /**
   * Creates a annotation
   * @param {Object} annotation - Annotation object returned from API
   */
  constructor(annotation) {
    super(Spaces.store);
    Object.assign(this, annotation);
  }

  /**
   * Saves a Annotation to the API
   * @param {File} file - Parent file object
   * @param {string} description - Description of the annotation
   * @param {number} offset - Offset from the beginning of the file
   * @param {number} length - Length of the annotation
   * @param {string} [data] - Data pointed to by the annotation
   */
  static create(file: File, description: string, offset: number, length: number, data: any, extra?: any): Promise<Annotation> {
    if (file === undefined) {
      return Promise.reject('file undefined');
    }
    if (!(file instanceof File)) {
      return Promise.reject('file is not File object');
    }
    if (description === undefined) {
      return Promise.reject('description undefined');
    }
    if (offset === undefined) {
      return Promise.reject('offset undefined');
    }
    if (length === undefined) {
      return Promise.reject('length undefined');
    }
    return postAnnotation(file.id.space_id, file.id.dataset_id, file.id.item_id, offset, length, description, data, extra)
      .then(payload => (
        checkEmpty(payload, () => new Promise(resolve => resolve(new Annotation(payload.items[0]))))
      ));
  }

  /**
   * Loads annotations from the API
   * @param {Dataset} dataset - Dataset to fetch annotations for
   * @returns {Promise<Annotation[]>}
   */
  static load(dataset: Dataset): Promise<Array<Annotation>> {
    if (dataset === undefined) {
      return Promise.reject('dataset undefined');
    }
    if (!(dataset instanceof Dataset)) {
      return Promise.reject('dataset is not an instance of Dataset');
    }
    return getAllAnnotations(dataset.id.space_id, dataset.id.item_id)
      .then(payload => {
        return payload.items.map(a => new Annotation(a)).filter(a => a !== undefined);
      });
  }

  /**
   * Updates an annotation in the API
   * @returns {Promise<Annotation>}
   */
  update(): Promise<Annotation> {
    if (this.description === undefined) {
      return Promise.reject('description undefined');
    }
    return patchAnnotation(this.id.space_id, this.id.dataset_id, this.id.file_id, this.id.item_id, this.description, this.extra)
      .then((payload) => {
        if (payload.count > 0) {
          const ret = this.copy() as Annotation;
          Object.assign(ret, payload.items[0]);
          return Promise.resolve(ret);
        }
        return Promise.reject('Empty result set');
      });
  }

  /**
   * Deletes an annotation in the API
   * @returns {Promise<Annotation>}
   */
  delete(): Promise<Annotation> {
    return deleteAnnotation(this.id.space_id, this.id.dataset_id, this.id.file_id, this.id.item_id)
      .then(() => {
        return Promise.resolve(this);
      });
  }

  /**
   * Adds a comment in the API
   */
  createComment(text: string): Promise<Annotation> {
    if (text === undefined || text.length === 0) {
      return Promise.reject('text must be defined');
    }
    return postAnnotationComment(this.id.space_id, this.id.dataset_id, this.id.file_id, this.id.item_id, text)
      .then((payload) => (
        checkEmpty(payload, () => simpleObjectReturn(payload, this))
      ));
  }

  /**
   * Adds a comment in the API
   */
  updateComment(id: string, text: string): Promise<Annotation> {
    if (id === undefined || id.length === 0) {
      return Promise.reject('id must be defined');
    }
    if (text === undefined || text.length === 0) {
      return Promise.reject('text must be defined');
    }
    return patchAnnotationComment(this.id.space_id, this.id.dataset_id, this.id.file_id, this.id.item_id, id, text)
      .then((payload) => (
        checkEmpty(payload, () => simpleObjectReturn(payload, this))
      ));
  }

  /**
   * Deletes a comment in the API
   */
  deleteComment(id: string): Promise<Annotation> {
    if (id === undefined || id.length === 0) {
      return Promise.reject('id must be defined');
    }
    return deleteAnnotationComment(this.id.space_id, this.id.dataset_id, this.id.file_id, this.id.item_id, id)
      .then((payload) => (
        simpleObjectReturn(payload, this)
      ));
  }
}
