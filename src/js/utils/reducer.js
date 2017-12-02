export function createReducer(initialState, handlers) {
  return (state = initialState, action) => {
    if (!action) return state;
    const handler = handlers[action.type];
    if (!handler) return state;
    const ret = Object.create(state);
    return Object.assign(ret, state, handler(state, action));
    // return { ...state, ...handler(state, action) };
  };
}

export function checkError(action, callback) {
  if (!action.error) {
    if (callback !== undefined) {
      return callback();
    }
    return action.payload;
  }
  return { error: action.error };
}

export default { createReducer };
