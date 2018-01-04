import Base from '../../js/app/base';
import Spaces from '../../js/app/spaces';
import Space from '../../js/app/space';
import Dataset from '../../js/app/dataset';
import File from '../../js/app/file';

let t;
let t2;
let t3;
let t4;
let t5;
let t6;
let t7;
let t8;
let u;
let u2;
let u3;
let s;

class Test extends Base {
  constructor(id) {
    super(s._store);
    this.id = id;
  }
}

beforeAll(() => {
  const space = new Space({ id: { item_id: 'foo' } });
  const dataset = new Dataset({ id: { item_id: '10', space_id: 'foo' } });
  const file = new File({ id: { item_id: '10', dataset_id: '10', space_id: 'foo' } });
  // dataset._files = { [file.itemid()]: file };

  // TODO change how we create the spaces object to conform to new standards
  s = new Spaces({ [space.itemid()]: space });
  s._space = [space];
  s._dataset = [dataset];
  s._file = [file];
  s._store = () => s;

  t = new Test({ space_id: 'foo', dataset_id: '10', file_id: '10', item_id: '10' });
  t2 = new Test({ space_id: 'foo', dataset_id: '10', file_id: '10', item_id: '11' });
  t3 = new Test({ space_id: 'foo', dataset_id: '11', file_id: '11', item_id: '10' });
  t4 = new Test({ space_id: 'foo2', dataset_id: '11', file_id: '11', item_id: '10' });
  t5 = new Test({ space_id: 'foo2', dataset_id: '11', file_id: '11', item_id: '11' });
  t6 = new Test({ item_id: 'foo2' });
  t7 = new Test({ space_id: 'foo', item_id: '12' });
  t8 = new Test({ space_id: 'foo', dataset_id: '12', item_id: '12' });

  u = new Test('foo@user');
  u2 = new Test('foo2@user2');
  class Id { toString() { return this.item_id; } }
  const testId = new Id();
  testId.item_id = 'foo';
  u3 = new Test(testId);
});

function updateStore(store) {
  s = store;
}

function compareSame(newstore) {
  const selfs = t._getSelfs();
  expect(selfs).toEqual(newstore[t._getKey()]);
}

describe('Base properties', () => {
  it('should return itemid()', () => {
    expect(t.itemid()).toBe('10');
  });

  it('should return the id for the name', () => {
    expect(t.itemname()).toBe('10');
  });

  it('should return the name after setting', () => {
    t.name = 'name';
    expect(t.itemname()).toBe('name');
  });

  it('props should only return the name and initialized', () => {
    t.name = 'name';
    expect(Object.keys(t.props())).toHaveLength(1);
    expect(t.props()).toEqual({ name: 'name' });
  });

  it('key should be set properly', () => {
    expect(t._getKey()).toBe('_test');
  });

  it('should return a space', () => {
    const rets = t.space();
    expect(rets.itemid()).toBe('foo');
    expect(rets instanceof Space).toBeTruthy();
  });

  it('should return a dataset', () => {
    const retd = t.dataset();
    expect(retd.itemid()).toBe('10');
    expect(retd instanceof Dataset).toBeTruthy();
  });

  it('should return datasets', () => {
    const retd = t.datasets();
    expect(retd).toHaveLength(1);
    expect(retd[0].itemid()).toBe('10');
    expect(retd[0] instanceof Dataset).toBeTruthy();
  });

  it('should return a file', () => {
    const retf = t.file();
    expect(retf.itemid()).toBe('10');
    expect(retf instanceof File).toBeTruthy();
  });

  it('should return files', () => {
    const retf = t.files();
    expect(retf).toHaveLength(1);
    expect(retf[0].itemid()).toBe('10');
    expect(retf[0] instanceof File).toBeTruthy();
  });

  it('should insert itself into the store', () => {
    const newstore = t.storeInsert();
    expect(t._store()).not.toEqual(newstore);
    expect(t._store()[t._getKey()]).not.toBeTruthy();
    expect(newstore[t._getKey()]).toHaveLength(1);
    expect(newstore[t._getKey()][0]).toBe(t);
    updateStore(newstore);
  });


  it('should wont insert itself twice', () => {
    const newstore = t.storeInsert();
    compareSame(newstore);
  });

  it('should load a new list of objects', () => {
    const newstore = t.storeLoad([t, t2]);
    expect(t._store()).not.toEqual(newstore);
    expect(t._store()[t._getKey()]).toHaveLength(1);
    expect(newstore[t._getKey()]).toHaveLength(2);
    expect(newstore[t._getKey()][1]).toBe(t2);
    updateStore(newstore);
  });

  it('should update itself in the store', () => {
    t.name = 'name';
    expect(t._store()[t._getKey()][0].name).toBe('name');
    const newt = t.copy();
    newt.name = 'name2';
    const newstore = newt.storeUpdate();
    expect(t._store()).not.toEqual(newstore);
    expect(t._store()[t._getKey()]).toHaveLength(2);
    expect(newstore[t._getKey()]).toHaveLength(2);
    expect(newstore[t._getKey()][0]).toEqual(newt);
    updateStore(newstore);
  });

  it('should not update something that does not exist', () => {
    const newstore = t5.storeUpdate();
    compareSame(newstore);
  });

  it('should delete itself from the store', () => {
    const newstore = t.storeDelete();
    expect(t._store()).not.toEqual(newstore);
    expect(t._store()[t._getKey()]).toHaveLength(2);
    expect(newstore[t._getKey()]).toHaveLength(1);
    expect(newstore[t._getKey()][0]).toBe(t2);
    updateStore(newstore);
  });

  it('should not delete something that does not exist', () => {
    const newstore = t5.storeDelete();
    compareSame(newstore);
  });

  it('should retrieve the right things with storeList', () => {
    updateStore(t.storeLoad([t, t2, t3, t4]));
    expect(t.storeList({ item_id: 'foo' })).toEqual([t, t2, t3]); // passed a space id
    expect(t.storeList({ space_id: 'foo', item_id: '10' })).toEqual([t, t2]);
    expect(t.storeList({ space_id: 'foo', dataset_id: '10', item_id: '10' })).toEqual([t, t2]);
    expect(t.storeList({ space_id: 'foo', dataset_id: '10', file_id: '10', item_id: '10' })).toEqual([t]);
    expect(t.storeList({ space_id: 'foo3' })).toHaveLength(0);
  });

  it('should retrieve the right things with storeGet', () => {
    updateStore(t.storeLoad([t, t2, t3, t4, t5, t6, t7, t8]));
    expect(t.storeGet({ item_id: 'foo2' })).toEqual(t6); // passed a space id
    expect(t.storeGet({ space_id: 'foo', item_id: '12' })).toEqual(t7);
    expect(t.storeGet({ space_id: 'foo', dataset_id: '12', item_id: '12' })).toEqual(t8);
    expect(t.storeGet({ space_id: 'foo2', dataset_id: '11', file_id: '11', item_id: '10' })).toEqual(t4);
    expect(t.storeGet({ space_id: 'foo3' })).toBeUndefined();
  });

  it('handles empty lists fine', () => {
    updateStore(new Spaces({}));
    updateStore(t.storeLoad([]));
    expect(t.storeList({ item_id: 'foo2' })).toHaveLength(0);
    expect(t.storeGet({ item_id: 'foo2' })).toBeUndefined();
  });

  it('handles string ids with get', () => {
    updateStore(new Spaces({}));
    updateStore(t.storeLoad([u, u2]));
    expect(t.storeGet('foo@user')).toBe(u);
    expect(t.storeGet('foo@user2')).toBeUndefined();
  });

  it('handles string ids with list', () => {
    updateStore(new Spaces({}));
    updateStore(t.storeLoad([u, u2, u3]));
    expect(t.storeList('foo')).toHaveLength(3);
    expect(t.storeList('foo2@user2')).toHaveLength(1);
    expect(t.storeList('asdf')).toHaveLength(0);
  });
});
