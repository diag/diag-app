import { AssetId } from '../utils';
import Spaces from './spaces';
import Space from './space';
import Base from './base';
import * as types from '../typings';
import { IBot } from '../typings';
import BaseImpl from './baseimpl';

/** Dataset containing files and activity */
export default class Bot extends BaseImpl implements types.IBot {
    id: types.id;
    name: string;
    description: string;
    search: string;
    severity: number;
    tags: Array<string>;
  
  /**
   * Create a bot
   * @param {Object} bot - Bot returned from the backend
   */
  constructor(bot) {
    super(Spaces.store);
    Object.assign(this, bot, { _store: Spaces.store });
  }

  static _type : string = 'bot';
  static _fromApi(payload: types.IAPIPayload): Promise<Bot[]> {
    if (payload.count > 0) {
        return Promise.resolve(payload.items.map(i => new Bot(i)));
    }
    return Promise.reject('Empty result set');
  }
}
