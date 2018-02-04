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
  (file: IFile, encoding?: string, rcPromise?: Promise<ArrayBuffer>): Promise<string>;
}

// TODO once file is defined, replace <Object> with <File>
export interface ISetRawContent {
  (file: IFile, content: Promise<ArrayBuffer>): Promise<any>;
}

export interface IRawContent {
  (file: IFile): Promise<ArrayBuffer>;
}

export interface IRawContentSize {
  (file: IFile): number;
}

export interface IHasRawContent {
  (file: IFile): boolean;
}

export interface IClearRawContent {
  (file: IFile): any;
}

export interface IGetFromCache {
  (id: id): Promise<ArrayBuffer> & Promise<never>;
}

export interface IStoreInCache {
  (id: id, content: Promise<ArrayBuffer>): Promise<ArrayBuffer> & Promise<never>;
}

export interface FTR {
  status: 'running' | 'done' | 'not done' | 'reset',
  disabled: boolean,
  script: string,
}

export interface id {
  item_id?: string;
  space_id?: string;
  dataset_id?: string;
  file_id?: string;
  type?: string;
}

export interface IAPIPayload {
  count: number,
  items: Array<any>,
  resumeToken?: string,
  http_headers?: any,
  http_method?: string,
  signed_url?: string,
}

export interface IAnnotation {
  id: id;
  description: string;
  offset: number;
  length: number;
  data: any;
}

export interface IActivity {
  id: id;
  type: ActivityType;
  data: any;
}

export type ActivityType = 'search' | 'upload' | 'annotation';

export interface IDataset {
  id: id;
  description: string;
  tags: Array<string>;
  problem: string;
  resolution: string;
  custom: any;
}

export interface IFile {
  id: id;
  name: string;
  description: string;
  contentType: string;
  size: number;
}

export interface ISpace {
  id: id;
  name: string;
  publicSpace?: boolean;
  dataset_cf_schema?: any;
  dataset_cf_uischema?: any;
  ftr: FTR;
}

export interface IBot {
  id: id;
  name: string;
  description: string;
  search: string;
  severity: number;
  tags: Array<string>;
}
