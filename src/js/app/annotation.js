import { postAnnotation, patchAnnotation, deleteAnnotation, postAnnotationComment, patchAnnotationComment,
  deleteAnnotationComment, getAllAnnotations } from '../api/annotations';
import { checkEmpty, simpleObjectReturn } from '../utils/apputils';
import Spaces from './spaces';
import Dataset from './dataset';
import File from './file';
import Base from './base';

/** Annotations on files */
export default class Annotation extends Base {
  /**
   * Creates a annotation
   * @param {File} parent - File object pointing to parent
   * @param {Object} annotation - Annotation object returned from API
   */
  constructor(parent, annotation) {
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
  static create(file, description, offset, length, data) {
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
    return postAnnotation(file.space().itemid(), file.dataset().itemid(), file.itemid(), offset, length, description, data)
      .then(payload => (
        checkEmpty(payload, () => new Promise(resolve => resolve(new Annotation(file, payload.items[0]))))
      ));
  }

  /**
   * Loads annotations from the API
   * @param {Dataset} dataset - Dataset to fetch annotations for
   * @returns {Promise<Annotation[]>}
   */
  static load(dataset) {
    if (dataset === undefined) {
      return Promise.reject('dataset undefined');
    }
    if (!(dataset instanceof Dataset)) {
      return Promise.reject('dataset is not an instance of Dataset');
    }
    return getAllAnnotations(dataset.space().itemid(), dataset.itemid())
      .then(payload => {
        return payload.items.map(a => {
          const f = dataset.file(a.id.file_id);
          if (f === undefined) {
            console.warn(`File id ${a.id.file_id} not in dataset id ${dataset.itemid()}`);
            return undefined;
          }
          return new Annotation(f, a);
        }).filter(a => a !== undefined);
      });
  }

  /**
   * Updates an annotation in the API
   * @returns {Promise<Annotation>}
   */
  update() {
    if (this.description === undefined) {
      return Promise.reject('description undefined');
    }
    return patchAnnotation(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid(), this.description)
      .then((payload) => {
        if (payload.count > 0) {
          const ret = this.copy();
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
  delete() {
    return deleteAnnotation(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid())
      .then(() => {
        return Promise.resolve(this);
      });
  }

  /**
   * Adds a comment in the API
   */
  createComment(text) {
    if (text === undefined || text.length === 0) {
      return Promise.reject('text must be defined');
    }
    return postAnnotationComment(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid(), text)
      .then((payload) => (
        checkEmpty(payload, () => simpleObjectReturn(payload, this))
      ));
  }

  /**
   * Adds a comment in the API
   */
  updateComment(id, text) {
    if (id === undefined || id.length === 0) {
      return Promise.reject('id must be defined');
    }
    if (text === undefined || text.length === 0) {
      return Promise.reject('text must be defined');
    }
    return patchAnnotationComment(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid(), id, text)
      .then((payload) => (
        checkEmpty(payload, () => simpleObjectReturn(payload, this))
      ));
  }

  /**
   * Deletes a comment in the API
   */
  deleteComment(id) {
    if (id === undefined || id.length === 0) {
      return Promise.reject('id must be defined');
    }
    return deleteAnnotationComment(this.space().itemid(), this.dataset().itemid(), this.file().itemid(), this.itemid(), id)
      .then((payload) => (
        simpleObjectReturn(payload, this)
      ));
  }
}
