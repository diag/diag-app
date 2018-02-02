import { Spaces, User } from '../app';
import { parseJSON, getOptions } from '../utils';
import * as types from '../typings';

export function getUser(userId: string): Promise<types.IAPIPayload> {
  const options = getOptions({ method: 'GET' });
  return fetch(`${Spaces.apiUrl()}${User.url(userId)}`, options)
    .then(parseJSON);
}

export function getPrefs(): Promise<types.IAPIPayload> {
  const options = getOptions({
    method: 'GET'
  });

  return fetchPrefs(options);
}

export function putPrefs(prefs: any): Promise<types.IAPIPayload> {
  const options = getOptions({
    method: 'PUT',
    body: JSON.stringify(prefs)
  });

  return fetchPrefs(options);
}

function fetchPrefs(options: any): Promise<types.IAPIPayload> {
  return fetch(`${Spaces.apiUrl()}/users/me/prefs`, options)
    .then(parseJSON);
}
