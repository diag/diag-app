

/**
 * A higher order WebSocket that can multiplex messages, each message is a
 * json object with two top level properties, {t: <type>, d: <payload-data>}
 *
 * The following types are reserved for the underlying websocket activity:
 * 1. close
 * 2. error
 * 3. open
 * 4. message  (if you use this, it will be mapped to the defaultType)
 *
 * Usage example:
 *
 * const ws = new JsonWebSocket(new WebSocket(....), 'foobar');
 * ws.addEventListener('message', console.log); // will print messages of type of 'foobar' (default)
 * ws.addEventListener('xyz', console.log);
 *
 * ws.addEventListener('close', ...); // 'open'/'close'/'error' are passed thru as well
 *
 * ... ensure ws is open ....
 *
 * ws.send('some simple message'); /// this will send an event of type 'foobar' (default)
 * ws.send('xyz', {foo: 'bar', baz: 42}); /// sends a new type of message
 *
 *
 */
export default class JsonWebSocket {
  /**
   * @param {WebSocket} ws - the WebSocket to wrap, do NOT use the raw websocket from this point on
   * @param {String} defaultType - the default event type - this is such that a JsonWebSocket can be used as a drop in replacement for
   * a WebSocket - if the default send() and addEventListener('messge' ...) are used, then the default event type will be used
   * @param {Number} keepAliveSec - send keep alive messages every this many seconds, set to 0 to disable keep alive messages
   */
  constructor(ws, defaultType, keepAliveSec = 30) {
    this.conn = ws;
    this.defaultType = defaultType;

    this.callbacks = {};

    // dispatch to the right handlers
    this.conn.addEventListener('message', (evt) => {
      try {
        const json = JSON.parse(evt.data);
        this._dispatch(json.t, json.d);
      } catch (e) {
        console.log(e);
      }
    });

    this.conn.addEventListener('close', () => { this._teardownKeepAlive(); this._dispatch('close', null); });
    this.conn.addEventListener('error', () => { this._dispatch('error', null); });
    this.conn.addEventListener('open', () => { this._setupKeepAlive(keepAliveSec); this._dispatch('open', null); });

    // in case socket is already 'open'
    this._setupKeepAlive(keepAliveSec);
  }

  _setupKeepAlive(keepAliveSec) {
    if (!this.keepAliveInt && keepAliveSec > 0 && this.conn.readyState === 1 /*OPEN*/) {
      this.keepAliveInt = setInterval(() => {
        try {
          this.send('_keepalive', {});
        } catch (ignore) {}
      }, keepAliveSec * 1000);
    }
  }

  _teardownKeepAlive() {
    if (this.keepAliveInt) {
      clearInterval(this.keepAliveInt);
      this.keepAliveInt = undefined;
    }
  }

  _dispatch(type, data) {
    if (type === '_keepalive') {
      return; // noop, ignore
    }
    (this.callbacks[type] || []).forEach(cb => {
      try {
        cb({ type, data });
      } catch (e) {
        console.log(e); // WTF?
      }
    });
  }

  _bind(eventType, callback) {
    const cbs = this.callbacks;
    cbs[eventType] = cbs[eventType] || [];
    cbs[eventType].push(callback);
    return this;// chainable
  }

  _unbind(eventType, callback) {
    if (!this.callbacks[eventType]) {
      return this;
    }
    this.callbacks[eventType] = this.callbacks[eventType].filter(cb => (cb !== callback));
    return this;
  }


  addEventListener(eventType, callback) {
    if (eventType === 'message') { // map 'message' to default eventtype
      eventType = this.defaultType;
    }
    return this._bind(eventType, callback);
  }
  removeEventListener(eventType, callback) {
    if (eventType === 'message') { // map 'message' to default eventtype
      eventType = this.defaultType;
    }
    return this._unbind(eventType, callback);
  }

  /**
   * If called with 1 argument we assume the JWS is used as a drop in
   * replacement for ws, in which case the defaultType will be used.
   * If called with 2 args, then it will use the first argument as
   * the type and second as the data to be sent
   *
   */
  send(...args) {
    let type = this.defaultType;
    let data;
    if (args.length === 2) {
      [type, data] = args;
    } else if (args.length === 1) {
      data = args[0];
    } else {
      throw new Error(`Unexpected number of arguments, length=${args.length}`);
    }
    const payload = JSON.stringify({ t: type, d: data });
    this.conn.send(payload);
    return this;
  }

  close() {
    this.conn.close();
  }
}

