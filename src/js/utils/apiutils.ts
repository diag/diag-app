import { Spaces } from '../app';
import { baseGet } from './zero';
import * as types from '../typings';

const USERS_CACHE = new Map();

export function getUser(uid: string): Promise<types.IAPIPayload> {
  const cached = USERS_CACHE.get(uid);
  if (cached) {
    return cached;
  }

  const p = baseGet(`${Spaces.apiUrl()}/users/${uid}`);
  USERS_CACHE.set(uid, p);
  return p;
}

export function clearCache() {
  USERS_CACHE.clear();
}

export function resolveUserId(payload: types.IAPIPayload, uidField?: string, resultField?: string): Promise<types.IAPIPayload> {
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
          photos: r.items[0].photos || [],
          profile: r.items[0].profile || {},
          created_at: r.items[0].created_at || 0,
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

