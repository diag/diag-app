import { Spaces } from '../app';

let _headers = {
  Accept: 'application/json',
  'Content-Type': 'application/json'
};

export function headers() {
  return _headers;
}

export function getOptions(extra) {
  return Object.assign({
    headers: headers(),
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
    if (document) {
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

const USERS_CACHE = new Map();

export function getUser(uid) {
  const cached = USERS_CACHE.get(uid);
  if (cached) {
    return Promise.resolve(cached);
  }

  return baseGet(`${Spaces.apiUrl()}/users/${uid}`)
    .then((res) => {
      USERS_CACHE.set(uid, res);
      return res;
    });
}

export function clearCache() {
  USERS_CACHE.clear();
}

export function resolveUserId(payload, uidField, resultField) {
  uidField = uidField || 'owner';
  resultField = resultField || 'owner_info';
  const uidMap = new Map();
  const promises = [];
  payload.items.forEach((a) => {
    const uid = a[uidField];
    if (uid) {
      if (!uidMap.has(uid)) {
        promises.push(getUser(uid));
        uidMap.set(uid, null);
      }
    }
  });

  return Promise.all(promises).then((results) => {
    results.forEach((r) => {
      if (r.count > 0) {
        uidMap.set(r.items[0].id, {
          display_name: r.items[0].display_name,
          photos: r.items[0].photos || []
        });
      }
    });

    payload.items.forEach((a) => {
      const uid = a[uidField];
      const info = uidMap.get(uid);
      if (info) {
        a[resultField] = info;
      }
    });
    return Promise.resolve(payload);
  });
}

