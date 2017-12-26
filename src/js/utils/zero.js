// NO! YOU CAN'T IMPORT SHIT !

function randomTextNoDeps(len) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < len; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const _sessionId = randomTextNoDeps(8);

export function getSessionId() {
  return _sessionId;
}

let _headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

export function headers() {
  return _headers;
}

export function getOptions(extra) {
  return Object.assign({
    headers: { ...headers(), 'X-Request-Id': `${_sessionId}-${randomTextNoDeps(8)}` },
    credentials: 'same-origin',
  }, extra);
}

export function putOptions(extra) {
  const h = { ...headers(), Accept: 'application/json', 'Content-Type': 'application/octet-stream' };
  return Object.assign({
    headers: h,
    method: 'PUT',
    credentials: 'same-origin',
  }, extra);
}


export function parseJSON(response) {
  if (response.ok) {
    return response.json();
  }
  return Promise.reject(response);
}

export function getText(response) {
  if (response.ok) {
    return response.text();
  }
  return Promise.reject(response);
}

export function updateHeaders(newHeaders) {
  _headers = { ..._headers, ...newHeaders };
  Object.keys(_headers).forEach((key) => {
    if (undefined === _headers[key]) {
      delete _headers[key];
    }
  });
}

export function checkMore(payload, url, options, items) {
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

export function apiFetch(url, options, items) {
  return fetch(url, options)
    .then(parseJSON)
    .then((payload) => (checkMore(payload, url, options, items)));
}

export function baseGet(url) {
  const options = getOptions({
    method: 'GET',
  });

  return apiFetch(url, options, {});
}

export function baseDelete(url) {
  const options = getOptions({
    method: 'DELETE',
  });

  return apiFetch(url, options, {});
}

export function basePost(url, body) {
  const options = getOptions({
    method: 'POST',
    body: JSON.stringify(body),
  });

  return apiFetch(url, options, {});
}

export function basePatch(url, body) {
  const options = getOptions({
    method: 'PATCH',
    body: JSON.stringify(body),
  });

  return apiFetch(url, options, {});
}

