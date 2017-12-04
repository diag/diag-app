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
let s;

beforeAll(() => {
  class Test extends Base {
    constructor(parent, id) {
      super(parent);
      this.id = id;
    }
  }
  const space = new Space({ id: { item_id: 'foo' } });
  const dataset = new Dataset(space, { id: { item_id: '10', space_id: 'foo' } });
  const file = new File(dataset, { id: { item_id: '10', dataset_id: '10', space_id: 'foo' } });
  space._datasets = { [dataset.itemid()]: dataset };
  dataset._files = { [file.itemid()]: file };

  // TODO change how we create the spaces object to conform to new standards
  s = new Spaces({ [space.itemid()]: space });
  s._store = () => s;

  t = new Test(s, { space_id: 'foo', dataset_id: '10', file_id: '10', item_id: '10' });
  t2 = new Test(s, { space_id: 'foo', dataset_id: '10', file_id: '10', item_id: '11' });
  t3 = new Test(s, { space_id: 'foo', dataset_id: '11', file_id: '11', item_id: '10' });
  t4 = new Test(s, { space_id: 'foo2', dataset_id: '11', file_id: '11', item_id: '10' });
  t5 = new Test(s, { space_id: 'foo2', dataset_id: '11', file_id: '11', item_id: '11' });
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

  it('props should only return the name', () => {
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

  it('should return a file', () => {
    const retf = t.file();
    expect(retf.itemid()).toBe('10');
    expect(retf instanceof File).toBeTruthy();
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
    t.name = 'name2';
    const newstore = t.storeUpdate();
    expect(t._store()).not.toEqual(newstore);
    expect(t._store()[t._getKey()]).toHaveLength(2);
    expect(newstore[t._getKey()]).toHaveLength(2);
    expect(newstore[t._getKey()][0]).toEqual(t);
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
    updateStore(t.storeLoad([t, t2, t3, t4]));
    expect(t.storeGet({ item_id: 'foo2' })).toEqual(t4); // passed a space id
    expect(t.storeGet({ space_id: 'foo', item_id: '11' })).toEqual(t3);
    expect(t.storeGet({ space_id: 'foo', dataset_id: '11', item_id: '11' })).toEqual(t3);
    expect(t.storeGet({ space_id: 'foo2', dataset_id: '11', file_id: '11', item_id: '10' })).toEqual(t4);
    expect(t.storeGet({ space_id: 'foo3' })).toBeUndefined();
  });

  it('handles empty lists fine', () => {
    updateStore(t.storeLoad([]));
    expect(t.storeList({ item_id: 'foo2' })).toHaveLength(0);
    expect(t.storeGet({ item_id: 'foo2' })).toBeUndefined();
  });
});

