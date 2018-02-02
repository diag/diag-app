import * as types from '../typings';

// NO! YOU CAN'T IMPORT SHIT !

let _apiHost: string = 'https://app.diag.ai';
let _apiBase: string = '/api/v1';

export function setApiHost(url: string) {
  _apiHost = url;
}

export function setApiBase(base: string) {
  _apiBase = base;
}

/**
 * Retrieives the API URL
 * @returns {string}
 */
export function apiUrl(): string {
  return `${_apiHost}${_apiBase}`;
}

/**
 * Retrieves the API Host - defaults to https://app.diag.ai/
 * @returns {string}
 */
export function apiHost(): string {
  return _apiHost;
}

/**
 * Retrieives the API base, e.g. '/api/v1'
 * @returns {string}
 */
export function apiBase(): string {
  return _apiBase;
}


export function joinUri(...args: Array<string>): string {
  // @ts-ignore
  return args.map(a => encodeURIComponent(a)).join('/');
}

function randomTextNoDeps(len: number): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < len; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const _sessionId: string = randomTextNoDeps(8);

export function getSessionId(): string {
  return _sessionId;
}

let _headers: any = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

const HEADER_REQ_ID: string = 'X-Request-Id';
function getRequestId(): string {
  return `${_sessionId}-${randomTextNoDeps(8)}`;
}


export function headers(): any {
  return { ..._headers,
    [HEADER_REQ_ID]: getRequestId() };
}

export function getOptions(extra: any): any {
  return Object.assign({
    headers: headers(),
    credentials: 'same-origin',
  }, extra);
}

export function putOptions(extra: any): any {
  const h = { ...headers(), 'Content-Type': 'application/octet-stream' };
  return Object.assign({
    headers: h,
    method: 'PUT',
    credentials: 'same-origin',
  }, extra);
}


export function parseJSON(response: any): Promise<any> {
  if (response.ok) {
    return response.json();
  }
  return Promise.reject(response);
}

export function getText(response: any): Promise<any> {
  if (response.ok) {
    return response.text();
  }
  return Promise.reject(response);
}

export function updateHeaders(newHeaders: any) {
  _headers = { ..._headers, ...newHeaders };
  Object.keys(_headers).forEach((key) => {
    if (undefined === _headers[key]) {
      delete _headers[key];
    }
  });
}

export function checkMore(payload: types.IAPIPayload, url: string, options: any, items: any): Promise<any> {
  if (typeof payload !== 'object') {
    return Promise.resolve(payload);
  }
  if (payload.count === undefined) {
    return Promise.resolve(payload);
  }
  // Concatenate results
  if (items.count) {
    items.count += payload.count;
  } else {
    items.count = payload.count;
  }
  if (items.items) {
    items.items.push(...payload.items);
  } else {
    items.items = payload.items;
  }
  // If we have a resumeToken, append resume token to the URL
  // and return another fetch promise
  if (payload.resumeToken) {
    let search;
    let parser;
    let sep = '?';
    if (typeof document !== 'undefined') {
      parser = document.createElement('a');
      parser.href = url;
    } else {
      // @ts-ignore
      const { URL } = require('url');
      parser = new URL(url);
    }
    search = parser.search;
    if (search.length > 0) {
      sep = '&';
    }
    const rt = `resumeToken=${encodeURIComponent(JSON.stringify(payload.resumeToken))}`;
    if (search.indexOf('resumeToken') === -1) {
      search = `${search}${sep}${rt}`;
    } else {
      search = search.replace(/resumeToken=[^&]+/, rt);
    }
    parser.search = search;
    url = parser.href;
    return apiFetch(url, options, items);
  }
  return Promise.resolve(items);
}

export function apiFetch(url: string, options: any, items: any): Promise<types.IAPIPayload> {
  options = options || {};
  if(!(options.headers || {})[HEADER_REQ_ID]) {
    options.headers = options.headers || {};
    options.headers[HEADER_REQ_ID] = getRequestId();
  }
  return fetch(url, options)
    .then(parseJSON)
    .then((payload) => (checkMore(payload, url, options, items)));
}

export function baseGet(url: string): Promise<types.IAPIPayload> {
  const options = getOptions({
    method: 'GET',
  });
  return apiFetch(url, options, {});
}

export function baseDelete(url: string): Promise<types.IAPIPayload> {
  const options = getOptions({
    method: 'DELETE',
  });
  return apiFetch(url, options, {});
}

export function basePost(url: string, body: any): Promise<types.IAPIPayload> {
  const options = getOptions({
    method: 'POST',
    body: JSON.stringify(body),
  });
  return apiFetch(url, options, {});
}

export function basePatch(url: string, body: any): Promise<types.IAPIPayload> {
  const options = getOptions({
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return apiFetch(url, options, {});
}

