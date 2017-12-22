import { Spaces } from '../app';
import { baseGet } from './zero';

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

export * from './zero';

