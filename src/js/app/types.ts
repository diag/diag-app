export interface IContentProvider {
  content?: IContent;
  setRawContent?: ISetRawContent;
  rawContent?: IRawContent;
  rawContentSize?: IRawContentSize;
  hasRawContent?: IHasRawContent;
  clearRawContent?: IClearRawContent;
  getFromCache: IGetFromCache;
  storeInCache: IStoreInCache;
}

export interface IContent {
  (file: Object, encoding?: string, rcPromise?: Promise<ArrayBuffer>): Promise<string>;
}

// TODO once file is defined, replace <Object> with <File>
export interface ISetRawContent {
  (file: Object, content: Promise<ArrayBuffer>): Promise<Object>;
}

export interface IRawContent {
  (file: Object): Promise<ArrayBuffer>;
}

export interface IRawContentSize {
  (file: Object): number;
}

export interface IHasRawContent {
  (file: Object): boolean;
}

export interface IClearRawContent {
  (file: Object): Object;
}

export interface IGetFromCache {
  (id: Object): Promise<ArrayBuffer> & Promise<never>;
}

export interface IStoreInCache {
  (id: Object, content: Promise<ArrayBuffer>): Promise<ArrayBuffer> & Promise<never>;
}

export interface id {
  item_id?: string;
  space_id?: string;
  dataset_id?: string;
  file_id?: string;
  type?: string;
}
