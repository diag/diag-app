

const SHORT_TYPE: Object = {
  s: { type: 'space', parts: ['item_id'] },
  d: { type: 'dataset', parts: ['space_id', 'item_id'] },
  b: { type: 'bot', parts: ['space_id', 'item_id'] },
  f: { type: 'file', parts: ['space_id', 'dataset_id', 'item_id'] },
  a: { type: 'annotation', parts: ['space_id', 'dataset_id', 'file_id', 'item_id'] },
  y: { type: 'activity', parts: ['space_id', 'dataset_id', 'file_id', 'item_id'] }, // file activity
  z: { type: 'activity', parts: ['space_id', 'dataset_id', 'item_id'] }, // dataset activity
};

const SEP: string = '/';

function sameElements(a: any, b: any): boolean {
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
  _valid: boolean;
  _t: string;
  _type: string;
  type: string;
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

  valid(): boolean {
    return this._valid;
  }

  _toString(firstSeg): string {
    if (!this.valid()) {
      return 'invalid';
    }
    const parts = [firstSeg];
    SHORT_TYPE[this._t].parts.forEach(p => {
      parts.push(this[p]);
    }, this);
    return parts.join(SEP);
  }

  parts() : Array<string> {
    if (!this.valid()) {
      return [];
    }
    const parts = [];
    SHORT_TYPE[this._t].parts.forEach(p => {
      parts.push(this[p]);
    }, this);
    return parts;
  }

  toString(): string {
    return this._toString(this._t);
  }
}
