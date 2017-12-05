import { getSpace } from '../api/datasets';
import Spaces from '../app/spaces';
import queryString from 'query-string';
import ms from 'ms';

let DOMAIN = '';
let TENANT = '';
export function getCurrentDomain() {
  if (DOMAIN.length === 0) {
    DOMAIN = window.location.hostname;
    // pick up domain from the hostname
    DOMAIN = DOMAIN.substring(DOMAIN.lastIndexOf('.', DOMAIN.lastIndexOf('.') - 1) + 1);
  }
  return DOMAIN;
}

export function getCurrentTenant() {
  if (TENANT.length === 0) {
    TENANT = window.location.hostname;
    // pick up domain from the hostname
    if (TENANT.indexOf('.') === -1) {
      TENANT = 'dev';
    } else {
      TENANT = TENANT.substring(0, TENANT.indexOf('.'));
    }
  }
  return TENANT;
}

const DEFAULT_TITLE = getCurrentDomain();

export function pageLoaded(title) {
  if (document) {
    if (title && typeof title === 'string') {
      title = `${title} | ${DEFAULT_TITLE}`;
    } else {
      title = DEFAULT_TITLE;
    }
    document.title = title;
  }
}

export function getSearchUrl(url, search, filter) {
  if (!search || search.trim().length === 0) {
    return url;
  }
  url = `${url}?q=${encodeURI(search)}`;
  if (filter !== undefined) {
    url = `${url}&f=${boolVal(filter) ? 1 : 0}`;
  }
  return url;
}

export function getStateFromLocation(location, stateVar, queryVar, defaultVal) {
  if (location) {
    if (location.state && (stateVar in location.state)) {
      return location.state[stateVar];
    }
    if (queryVar) {
      const qs = queryString.parse(location.search);
      if (queryVar in qs) {
        return qs[queryVar];
      }
    }
  }
  return defaultVal;
}

export function getAuthUrl(provider, redirTo) {
  let port = '';
  if (window.location.port !== 80 && window.location.port !== 443) {
    port = `:${window.location.port}`;
  }
  redirTo = redirTo !== undefined ? redirTo : `${window.location.protocol}//${window.location.host}/`;
  const authBase = `${window.location.protocol}//app.${getCurrentDomain()}${port}/auth`;
  return `${authBase}/${provider}?redirectTo=${encodeURIComponent(redirTo)}`;
}

export function getSearchFromLocation(location) {
  return getStateFromLocation(location, 'search', 'q', '');
}

export function getUserSpaces(spaces, userId) {
  return (spaces.spaces().find(s => s.owner === userId) || []);
}

export function getTimeAgo(since) {
  return ms(new Date().getTime() - (since * 1000));
}

export function getLongTimeAgo(since) {
  return ms(new Date().getTime() - (since * 1000), { long: true });
}

function _dispatchError(error, dispatch, action, status, callback) {
  console.error('Caught error: ', error);
  dispatch({
    type: action,
    error,
    status,
  });
  if (callback !== undefined) {
    callback(dispatch);
  }
  return Promise.reject(error);
}
/**
 * Catches error and dispatches an error with the right type.
 * @param {Response} response - Response from the fetch API
 * @param {function} dispatch - Dispatch to redux
 * @param {string} action - Action to dispatch
 * @param {function} [callback] - Callback to call
 * @param {function} [unauthorizedCallback] - Callback when unauthorized
 */
export function dispatchError(response, dispatch, action, callback) {
  let error;
  let status;
  if (response.statusText) {
    status = response.status;
    // try to pick up error message from response body
    return response.json()
      .then((data) => {
        if (data && data.message) {
          error = data.message;
          return Promise.resolve();
        }
        return Promise.reject(); // so we go to .catch below
      }).catch(() => {
        error = { status: response.status, statusText: response.statusText };
      }).then(() => (
        _dispatchError(error, dispatch, action, status, callback) // exit point
      ));
  } else if (response instanceof Error) {
    error = response.message;
  } else if (typeof response === 'object') {
    error = response.toString();
  } else {
    error = response;
  }
  return _dispatchError(error, dispatch, action, undefined, callback); // exit point
}

/**
 * Handles basic promise of dispatching an action with the returned promise payload
 * or calling dispatchError on error
 * @param {function} promiseFunc - Function which returns a promise
 * @param {string} action - Redux action
 * @param {function} successCallback - Function to call on success
 * @param {function} errorCallback - Function to call on error
 * @returns Promise<object>
 */
export function promiseDispatch(promiseFunc, action, successCallback, errorCallback) {
  return (dispatch, getStore) => (
    promiseFunc(dispatch, getStore)
      .then((payload) => {
        dispatch({ type: action, payload });
        if (successCallback) {
          successCallback(dispatch);
        }
        return Promise.resolve(payload);
      })
      .catch(error => (
        dispatchError(error, dispatch, action, errorCallback)
      ))
  );
}

/**
 * Handles dispatching of an action that also creates activity as a byproduct
 * @param {function} promiseFunc - Function which returns a promise
 * @param {string} action - Redux action
 * @param {string} actvityCallback - Callback which returns a promise, called when we are successful - intention is this will be Activity.create, but could be anything
 * @param {function} successCallback - Function to call on success
 * @param {function} errorCallback - Function to call on error
 * @returns Promise<object>
 */
export function promiseDispatchWithActivity(promiseFunc, action, activityCallback, successCallback, errorCallback) {
  return (dispatch, getStore) => (
    promiseFunc(dispatch, getStore)
      .catch((error) => (dispatchError(error, dispatch, action, errorCallback)))
      .then((payload) => {
        dispatch({ type: action, payload });
        return Spaces.dispatchCreate(activityCallback(payload));
      })
  );
}

/**
 * Handles error from dispatchError
 * @param {Object} action - Action in redux format
 * @param {function} callback - Actions to take without errors
 */
export function handleError(state, action, callback) {
  if (!action.error) {
    return { error: undefined, ...callback() };
  }
  let ret = Object.create(state.constructor.prototype);
  ret = Object.assign(ret, state, { error: action.error, status: action.status });
  return ret;
}

export function clampStr(str, maxLen) {
  return (str.length < maxLen || str.length < 4) ? str : `${str.substr(0, maxLen - 3)}...`;
}

export function boolVal(v) {
  if (v === null || v === undefined) {
    return false;
  }
  if (v === true || v === 1) {
    return true;
  }
  if (v.toLowerCase) {
    v = v.toLowerCase();
    return v === '1' || v === 't' || v === 'true' || v === 'y' || v === 'yes';
  }
  return false;
}

/**
 * Checks the API for the existance of a space
 * @param {string} id - Space ID
 * @param {function} callbackIfExists - Function to call if the space exists
 * @param {function} callbackIfError - Function to call on error (not 404)
 * @param {function} callbackIfNotExist - Function to call if it doesn't exist
 */
export function checkSpaceExists(id, callbackIfExists, callbackIfError, callbackIfNotExist) {
  if (id.length > 0) {
    getSpace(id)
      .then(() => {
        // Not an error, must exist, even if we can't see it
        if (callbackIfExists) {
          callbackIfExists();
        }
      })
      .catch((error) => {
        if (error.status !== 404 && callbackIfError) {
          callbackIfError(error);
        } else if (callbackIfNotExist) {
          callbackIfNotExist();
        }
      });
  }
}

/*
* Binary search in JavaScript.
* Returns the index of of the element in a sorted array or (-n-1) where n is the insertion point for the new element.
* Parameters:
*     ar - A sorted array
*     el - An element to search for
*     cmpFunc - A comparator function. The function takes two arguments: (a, b) and returns:
*        a negative number  if a is less than b;
*        0 if a is equal to b;
*        a positive number of a is greater than b.
*     start - optional start offset  (inclusive)
*     end - optional, index of last item to search (inclusive)
* The array may contain duplicate elements. If there are more than one equal elements in the array,
* the returned value can be the index of any one of the equal elements.
*/
/* eslint no-bitwise: off */
export function binarySearch(ar, el, cmpFunc, start, end) {
  let m = start || 0;
  let n = end || (ar.length - 1);
  while (m <= n) {
    const k = (n + m) >> 1;
    const cmp = cmpFunc(el, ar[k]);
    if (cmp > 0) {
      m = k + 1;
    } else if (cmp < 0) {
      n = k - 1;
    } else {
      return k;
    }
  }
  return -m - 1;
}


export function htmlDecode(input) {
  const doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.documentElement.textContent;
}

/* eslint no-loop-func: off */
export function setLinkTargets(node, router) {
  const links = node.getElementsByTagName('a');
  for (let i = 0; i < links.length; i++) {
    const n = links[i];
    const currentDomain = getCurrentDomain();
    const currentDomainIdx = n.href.indexOf(currentDomain);
    if (n.href.substr(0, 1) === '/' || currentDomainIdx > -1) {
      let path;
      if (currentDomainIdx > -1) {
        const relPathStart = n.href.indexOf('/', currentDomainIdx);
        path = n.href.substr(relPathStart, n.href.length - relPathStart);
      } else {
        path = n.href;
      }
      n.addEventListener('click', (event) => {
        event.preventDefault();
        router.history.push(path);
      });
      n.removeAttribute('href');
    } else {
      n.target = '_blank';
    }
  }
}
