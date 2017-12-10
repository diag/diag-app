

const SHORT_TYPE = {
  s: { type: 'space', parts: ['item_id'] },
  d: { type: 'dataset', parts: ['space_id', 'item_id'] },
  f: { type: 'file', parts: ['space_id', 'dataset_id', 'item_id'] },
  a: { type: 'annotation', parts: ['space_id', 'dataset_id', 'file_id', 'item_id'] },
  y: { type: 'activity', parts: ['space_id', 'dataset_id', 'file_id', 'item_id'] }, // file activity
  z: { type: 'activity', parts: ['space_id', 'dataset_id', 'item_id'] }, // dataset activity
};

const SEP = '/';

function sameElements(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    return false;
  }
  const ac = [...a];
  const bc = [...b];
  ac.sort();
  bc.sort();

  return ac.find((e, i) => {
    return e !== bc[i];
  }) === undefined;
}

export default class AssetId {
  constructor(id) {
    this._valid = false;
    if (typeof (id) === 'string') {
      const parts = id.split(SEP);
      this._t = parts.shift();
      const typeDetails = SHORT_TYPE[this._t];

      if (typeDetails && typeDetails.parts.length === parts.length) {
        this._type = typeDetails.type;
        for (let i = 0; i < parts.length; i++) {
          this[typeDetails.parts[i]] = parts[i];
        }
        this._valid = true;
      }
    } else {
      Object.assign(this, id);
      if (this.type) {
        this._type = this.type;
        delete this.type;
        const keys = Object.keys(this).filter(k => !k.startsWith('_')); // all keys starting with _ are not part of ID
        this._t = Object.keys(SHORT_TYPE).find(k => {
          const typeDetails = SHORT_TYPE[k];
          return typeDetails.type === this._type && sameElements(keys, typeDetails.parts);
        }, this);

        if (this._t !== undefined) {
          this._valid = true;
        }
      }
    }
    Object.freeze(this); // can't be changed after c'tor
  }

  valid() {
    return this._valid;
  }

  _toString(firstSeg) {
    if (!this.valid()) {
      return 'invalid';
    }
    const parts = [firstSeg];
    SHORT_TYPE[this._t].parts.forEach(p => {
      parts.push(this[p]);
    }, this);
    return parts.join(SEP);
  }

  toString() {
    return this._toString(this._t);
  }
}
