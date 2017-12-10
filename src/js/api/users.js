import { Spaces, User } from '../app';
import { parseJSON, getOptions } from '../utils';

export function getUser(userId) {
  const options = getOptions({ method: 'GET' });
  return fetch(`${Spaces.apiUrl()}${User.url(userId)}`, options)
    .then(parseJSON);
}

export function getPrefs() {
  const options = getOptions({
    method: 'GET'
  });

  return fetchPrefs(options);
}

export function putPrefs(prefs) {
  const options = getOptions({
    method: 'PUT',
    body: JSON.stringify(prefs)
  });

  return fetchPrefs(options);
}

function fetchPrefs(options) {
  return fetch(`${Spaces.apiUrl()}/users/me/prefs`, options)
    .then(parseJSON);
}
