import Base from "./base";
import * as types from '../typings';
import AssetId from "../utils/assetid";
import { deleteObject, patchObject, postObject, getObjects } from "../api/datasets";

/**
 * When extending this class make sure to:
 * a) set the static variable _type to the object type being implemented (e.g. space, file, bot etc)
 *    this variable will be used to construct the endpoint URLs (NOTE: use singular)
 * b) a static method _fromApi that processes the API payload and returns an array of objects
 */
export default abstract class BaseImpl extends Base {
    static _type : string = 'unknown';
    static _fromApi(payload: types.IAPIPayload) : Promise<Array<BaseImpl>> {
        return Promise.reject('_newObj not implemented');
    }
    
    static load(aid: AssetId) : Promise<Array<BaseImpl>> {
        return getObjects(this._type, aid.parts())
              .then(this._fromApi); 
    }

    static delete(aid: AssetId) : Promise<Array<BaseImpl>> {
        return deleteObject(this._type, aid.parts())
            .then(this._fromApi);
    }

    static update(aid: AssetId, content: any) : Promise<Array<BaseImpl>> {
        return patchObject(this._type, aid.parts(), content)
            .then(this._fromApi); 
    }

    static create(aid: AssetId, content: any) : Promise<Array<BaseImpl>>{
        return postObject(this._type, aid.parts(), content)
              .then(this._fromApi); 
    }
        
}

