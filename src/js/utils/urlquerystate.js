import queryString from 'query-string';
import { boolVal } from 'diag-app/src/js/utils/uiutils';

export function toQueryString(params) {
  return Object.entries(params)
    .filter(k => k[1] !== undefined)
    .map(k => `${encodeURIComponent(k[0])}=${encodeURIComponent(k[1])}`)
    .join('&');
}

function toQueryVal(v, type) {
  if (type === 'bool') {
    return v ? 1 : 0;
  }
  return v;
}

function fromQueryVal(v, type) {
  if (type === 'bool') {
    return boolVal(v);
  }
  if (type === 'int') {
    return parseInt(v, 10);
  }
  if (type === 'float') {
    return parseFloat(v);
  }
  return v;
}

export default class UrlQueryState {
  constructor(history) {
    this.history = history;
    this.state2url = [];
  }

  addField(stateName, queryName, type = 'string') {
    this.state2url.push([stateName, queryName, type]);
    return this;
  }

  read(state, hist) {
    hist = hist || this.history;
    const qs = queryString.parse(hist.location.search);
    this.state2url.forEach(k => {
      if (k[1] in qs) {
        state[k[0]] = fromQueryVal(qs[k[1]], k[2]);
      }
    });
  }

  _getUrlFor(state) {
    const qs = queryString.parse(this.history.location.search);

    // add replace query args from state
    this.state2url.forEach(k => {
      if (k[0] in state) {
        qs[k[1]] = toQueryVal(state[k[0]], k[2]);
      }
    });

    // now turn qs back to a query string
    const query = toQueryString(qs);
    let url = this.history.location.pathname;
    if (query && query.length > 0) {
      url = `${url}?${query}`;
    }

    // add hash if needed
    if (this.history.location.hash) {
      url = `${url}#${this.history.location.hash}`;
    }
    return url;
  }

  push(state) {
    this.history.push(this._getUrlFor(state));
  }

  replace(state) {
    this.history.replace(this._getUrlFor(state));
  }
}

