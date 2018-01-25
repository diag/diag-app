import { updateHeaders, headers, parseJSON } from './apiutils';
import { random as textRandom } from './textutils';
import { Spaces } from '../app';
// import fs from 'fs';
// import path from 'path';

let app;

export function getTID() {
  return textRandom(8);
}

// function getNockCacheFileName(testName) {
//   const p = path.join(path.dirname(fs.realpathSync(__filename)), ...`../../../__tests__/__nock__cache__/${testName}.js.nockCache`.split('/'));
//   console.log(p);
//   return p;
// }

export function testSetup(testName, TID) {
  Spaces.setApiHost('http://localhost:3333');
  let appWait;
  if (!('SKIP_SERVER' in process.env)) {
    app = require('gdi-http/src/server');
    appWait = app.app.promise
      .then(() => { console.log('api server ready ... shoot!'); });
  } else {
    appWait = Promise.resolve();
  }
  const owner = `user@${TID}`;
  const options = { headers: headers() };

  console.log('Starting backend test, TID: ', TID);

  const authUrl = `${Spaces.apiHost()}/auth/token/magic/${owner}?displayName=Test+User${TID}&email=testuser@dev.diag.ai&diag_domains=[{"id":"123","name":"dev"}]`;
  console.log('Creating new user at URL: ', authUrl);

  // if ('UPDATE_NOCK_CACHE' in process.env) {
  //   console.log('Recording to update nock cache');
  //   nock.recorder.rec({
  //     dont_print: true,
  //     output_objects: true,
  //     enable_reqheaders_recording: true
  //   });
  // }
  // } else {
  //   const nockCacheFile = getNockCacheFileName(testName);
  //   console.log(`Loading nock cache from ${nockCacheFile}`);
  //   const nockDefs = nock.loadDefs(nockCacheFile);
  //   nockDefs.forEach((d) => {
  //     d.path = d.path.replace(/user@[A-Za-z0-9]+/, owner);
  //     d.path = d.path.replace(/space[A-Za-z0-9]+/, spaceId);
  //     d.path = d.path.replace(/Test\+User[A-Za-z0-9]+/, `Test+User${TID}`);
  //   });
  //   console.log('Loading nockDefs: ', nockDefs);
  //   nock.define(nockDefs);
  // }

  return appWait.then(() => (fetch(authUrl, options)))
    .then(parseJSON)
    .then((payload) => {
      if (payload.message === 'success') {
        console.log(`Added user user@${TID}, received token ${payload.token}`);
        updateHeaders({ Authorization: `Bearer ${payload.token}` });
        return new Promise((resolve) => { console.log('test setup complete'); resolve(); });
      }
      return Promise.reject('Creating auth token failed');
    });
}

export function testData() {
  const TID = getTID();
  return {
    TID,
    spaceId: `space${TID}`,
    space2Id: `space2${TID}`,
    space3Id: `space3${TID}`,
    spaceName: `spacename${TID}`,
    space2Name: `space2name${TID}`,
    owner: `user@${TID}`,
    spaces: new Spaces(),
    d1orig: dataset1orig,
    d2orig: dataset2orig,
    f1orig: file1orig,
    f2orig: file2orig,
    f3orig: file3orig,
    interimState: {},
    initialState: {},
  };
}

export function testTearDown() {
// export function testTearDown(testName) {
  // if ('UPDATE_NOCK_CACHE' in process.env) {
  //   const nockCacheFile = getNockCacheFileName(testName);
  //   console.log(`Updating nock cache file ${nockCacheFile}`);
  //   const nockData = nock.recorder.play();
  //   console.log(nockData);
  //   console.log(`Writing to ${nockCacheFile}`);
  //   return new Promise((resolve, reject) => {
  //     fs.writeFile(nockCacheFile, JSON.stringify(nockData), (error) => {
  //       if (error) {
  //         const msg = `error writing to file ${nockCacheFile}: ${error.message}`;
  //         console.error(msg);
  //         reject(msg);
  //       } else {
  //         console.log('success!');
  //         resolve('success');
  //       }
  //     });
  //   });
  // }
  return new Promise(resolve => {
    if (!('SKIP_SERVER' in process.env)) {
      app.server().close(() => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function catchErr(err) {
  console.log(err);
  if (typeof err.text === 'function') {
    err.text().then(payload => console.log(payload));
  } else {
    console.log(err);
  }
}


//
// Test Data
//

export const file1content = `[foo]
item1 = val1
item2 = val2

[foo2]
item3 = val3
item4 = val4`;

export const file2content = `Sep 15 22:04:44 Clints-MacBook-Pro Kiwi for Gmail[306]: [clint@taktak.io] New Server Important Count: 1
Sep 15 22:04:45 Clints-MacBook-Pro Kiwi for Gmail[306]: [coccyx@gmail.com] New Server Important Count: 19
Sep 15 22:04:48 Clints-MacBook-Pro Kiwi for Gmail[306]: [coccyx@gmail.com]STOP SESSIONS
Sep 15 22:04:48 Clints-MacBook-Pro Kiwi for Gmail[306]: [clint@taktak.io]STOP SESSIONS`;

export const file3content = `this:
  is:
    some:
      - yaml
      - to insert
    yeah:
      - oh
      - yeah`;


export const dataset1orig = {
  name: 'dataset1',
  description: 'dataset1 descr',
  tags: ['dataset1', 'tags1'],
  problem: 'dataset1 prob',
  resolution: 'dataset1 resolution',
};
export const dataset2orig = {
  name: 'dataset2',
  description: 'dataset2 descr',
  tags: ['dataset2', 'tags2'],
  problem: 'dataset2 prob',
  resolution: 'dataset2 resolution',
};
export const file1orig = {
  name: 'file1.conf',
  description: 'file1 conf',
  contentType: 'text/plain',
  content: file1content,
};
export const file2orig = {
  name: 'file2.log',
  description: 'file2 log',
  contentType: 'text/plain',
  content: file2content,
};
export const file3orig = {
  name: 'file3.yml',
  description: 'file3 yml',
  contentType: 'application/yaml',
  content: file3content,
};
