import Base from "./base";
import * as types from '../typings';
import AssetId from "../utils/assetid";
import { deleteObject, patchObject, postObject, getObjects } from "../api/datasets";


export default abstract class BaseImpl extends Base {
    static _type : string = 'unknown';
    static _newObj(payload: types.IAPIPayload) : Promise<Array<BaseImpl>> {
        return Promise.reject('_newObj not implemented');
    }
    
    static get(aid: AssetId) : Promise<Array<BaseImpl>> {
        return getObjects(this._type, aid.parts())
              .then(this._newObj); 
    }

    static delete(aid: AssetId) : Promise<Array<BaseImpl>> {
        return deleteObject(this._type, aid.parts())
            .then(this._newObj);
    }

    static update(aid: AssetId, content: any) : Promise<Array<BaseImpl>> {
        return patchObject(this._type, aid.parts(), content)
            .then(this._newObj); 
    }

    static create(aid: AssetId, content: any) : Promise<Array<BaseImpl>>{
        return postObject(this._type, aid.parts(), content)
              .then(this._newObj); 
    }
        
}

