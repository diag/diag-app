import { AssetId } from '../utils';
import Spaces from './spaces';
import Space from './space';
import Base from './base';
import * as types from '../typings';
import { IBoard } from '../typings';
import BaseImpl from './baseimpl';

export default class Board extends BaseImpl implements IBoard {
  id: types.id;
  name: string;
  description: string;
  tags: Array<string>;
  assets: Array<string>;
  view: any;
  
  /**
   * Create a board
   * @param {Object} board - Bot returned from the backend
   */
  constructor(board) {
    super(Spaces.store);
    Object.assign(this, board, { _store: Spaces.store });
  }

  static _type : string = 'board';
  static _fromApi(payload: types.IAPIPayload): Promise<Board[]> {
    if (payload.count > 0) {
        return Promise.resolve(payload.items.map(i => new Board(i)));
    }
    return Promise.resolve([]);
  }
}
