function createTester() {
  'use strict';

  var pouch = new PouchDB('pouch_test');
  var pouchWebSQL = new PouchDB('pouch_test_websql', {adapter: 'websql'});
  var pouchWorker = new PouchDB('pouch_test_worker', {adapter: 'worker'});
  var lokiDB = new loki.Collection('loki_test', {indices: ['id']});
  var dexieDB = new Dexie('dexie_test');
  dexieDB.version(1).stores({docs: '++,id'});
  dexieDB.open();
  var openIndexedDBReq;
  var webSQLDB;
  var localForageDB;
  var localForageWebSQLDB;
  var obj, map, set;
  if (typeof localforage !== 'undefined') {
    localForageDB = localforage.createInstance({
      name: 'test_localforage'
    });
    localForageWebSQLDB = localforage.createInstance({
      name: 'test_localforage_websql',
      driver: localforage.WEBSQL
    });
  }

  function createDoc() {
    return {
      data: Math.random()
    };
  }
  function createDocs(numDocs) {
    var docs = new Array(numDocs);
    for (var i = 0; i < numDocs; i++) {
      docs[i] = createDoc();
    }
    return docs;
  }
  function regularObjectTest(docs) {
    obj = {};
    for (var i = 0; i < docs.length; i++) {
      obj['doc_' + i] = docs[i];
    }
  }
  function mapTest(docs) {
    map = new Map();
    for (var i = 0; i < docs.length; i++) {
      map.set('doc_' + i, docs[i]);
    }
  }
  function setTest(docs) {
    set = new Set();
    for (var i = 0; i < docs.length; i++) {
      set.add(docs[i]);
    }
  }
  function localStorageTest(docs) {
    for (var i = 0; i < docs.length; i++) {
      localStorage['doc_' + i] = docs[i];
    }
  }

  function pouchBulkTest(docs) {
    for (var i = 0; i < docs.length; i++) {
      docs[i]._id = 'doc_' + i;
    }
    return pouch.bulkDocs(docs);
  }

  function pouchWebSQLBulkTest(docs) {
    for (var i = 0; i < docs.length; i++) {
      docs[i]._id = 'doc_' + i;
    }
    return pouchWebSQL.bulkDocs(docs);
  }

  function pouchWorkerBulkTest(docs) {
    for (var i = 0; i < docs.length; i++) {
      docs[i]._id = 'doc_' + i;
    }
    return pouchWorker.bulkDocs(docs);
  }

  function pouchTest(docs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      return doAddDoc;
      function doAddDoc() {
        var doc = docs[i];
        doc._id = 'doc_' + i;
        return pouch.put(doc);
      }
    }
    for (var i = 0; i < docs.length; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function pouchWorkerTest(docs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      return doAddDoc;
      function doAddDoc() {
        var doc = docs[i];
        doc._id = 'doc_' + i;
        return pouchWorker.put(doc);
      }
    }
    for (var i = 0; i < docs.length; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function pouchWebSQLTest(docs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      return doAddDoc;
      function doAddDoc() {
        var doc = docs[i];
        doc._id = 'doc_' + i;
        return pouchWebSQL.put(doc);
      }
    }
    for (var i = 0; i < docs.length; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function lokiTest(docs) {
    for (var i = 0; i < docs.length; i++) {
      var doc = docs[i];
      doc.id = 'doc_ ' + i;
      lokiDB.insert(doc);
    }
  }

  function localForageTest(docs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      return doAddDoc;
      function doAddDoc() {
        var doc = docs[i];
        return localForageDB.setItem('doc_' + i, doc);
      }
    }
    for (var i = 0; i < docs.length; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function localForageWebSQLTest(docs) {
    var promise = Promise.resolve();
    function addDoc(i) {
      return doAddDoc;
      function doAddDoc() {
        var doc = docs[i];
        return localForageWebSQLDB.setItem('doc_' + i, doc);
      }
    }
    for (var i = 0; i < docs.length; i++) {
      promise = promise.then(addDoc(i));
    }
    return promise;
  }

  function localForageBulkTest(docs) {
    var payload = {};
    for (var i = 0; i < docs.length; i++) {
      payload['doc_' + i] = docs[i];
    }
    return localForageDB.setItems(payload);
  }

  function localForageWebSQLBulkTest(docs) {
    var payload = {};
    for (var i = 0; i < docs.length; i++) {
      payload['doc_' + i] = docs[i];
    }
    return localForageWebSQLDB.setItems(payload);
  }

  function dexieTest(docs) {
    return dexieDB.transaction('rw', dexieDB.docs, function () {
      for (var i = 0; i < docs.length; i++) {
        var doc = docs[i];
        doc.id = 'doc_' + i;
        dexieDB.docs.add(doc);
      }
    });
  }

  function idbTest(docs) {
    return Promise.resolve().then(function () {
      if (openIndexedDBReq) {
        // reuse the same event to avoid onblocked when deleting
        return openIndexedDBReq.result;
      }
      return new Promise(function (resolve, reject) {
        var req = openIndexedDBReq = indexedDB.open('test_idb', 1);
        req.onblocked = reject;
        req.onerror = reject;
        req.onupgradeneeded = function (e) {
          var db = e.target.result;
          db.createObjectStore('docs', {keyPath: 'id'});
        };
        req.onsuccess = function (e) {
          var db = e.target.result;
          resolve(db);
        };
      });
    }).then(function (db) {
      return new Promise(function (resolve, reject) {
        var txn = db.transaction('docs', 'readwrite');
        var oStore = txn.objectStore('docs');
        for (var i = 0; i < docs.length; i++) {
          var doc = docs[i];
          doc.id = 'doc_' + i;
          oStore.put(doc);
        }
        txn.oncomplete = resolve;
        txn.onerror = reject;
        txn.onblocked = reject;
      });
    });
  }

  function webSQLTest(docs) {
    return Promise.resolve().then(function () {
      if (webSQLDB) {
        return;
      }
      return new Promise(function (resolve, reject) {
        webSQLDB = openDatabase('test_websql', 1, 'test_websql', 5000);
        webSQLDB.transaction(function (txn) {
          txn.executeSql(
            'create table if not exists docs (id text unique, json text);');
        }, reject, resolve);
      });
    }).then(function () {
      return new Promise(function (resolve, reject) {
        webSQLDB.transaction(function (txn) {
          for (var i = 0; i < docs.length; i++) {
            var id = 'doc_' + i;
            var doc = docs[i];
            txn.executeSql(
              'insert or replace into docs (id, json) values (?, ?);', [
                id, JSON.stringify(doc)
              ]);
          }
        }, reject, resolve);
      });
    });
  }
  function getTest(db) {
    var fun = _getTest(db);
    return test;
    function test(arg) {
      if (typeof arg === 'number') {
        var docs = createDocs(arg);
        return fun(docs);
      } else {
        return fun(arg);
      }
    }
  }
  function _getTest(db) {
    switch (db) {
      case 'regularObject':
        return regularObjectTest;
      case 'localStorage':
        return localStorageTest;
      case 'pouch':
        return pouchTest;
      case 'pouchWebSQL':
        return pouchWebSQLTest;
      case 'pouchWorker':
        return pouchWorkerTest;
      case 'pouchBulk':
        return pouchBulkTest;
      case 'pouchWebSQLBulk':
        return pouchWebSQLBulkTest;
      case 'pouchWorkerBulk':
        return pouchWorkerBulkTest;
      case 'loki':
        return lokiTest;
      case 'localForage':
        return localForageTest;
      case 'localForageWebSQL':
        return localForageWebSQLTest;
      case 'localForageBulk':
        return localForageBulkTest;
      case 'localForageWebSQLBulk':
        return localForageWebSQLBulkTest;
      case 'dexie':
        return dexieTest;
      case 'idb':
        return idbTest;
      case 'webSQL':
        return webSQLTest;
      case 'map':
        return mapTest;
      case 'set':
        return setTest;
    }
  }


  function cleanup() {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }

    var lokiDocuments = lokiDB.find();
    for (var i = 0; i < lokiDocuments.length; i++) {
      lokiDB.remove(lokiDocuments[i]);
    }

    var promises = [
      new Promise(function (resolve, reject) {
        if (typeof openDatabase === 'undefined') {
          return resolve();
        }
        var webSQLDB = openDatabase('test_websql', 1, 'test_websql', 5000);
        webSQLDB.transaction(function (txn) {
          txn.executeSql('delete from docs;');
        }, resolve, resolve);
      }),
      new Promise(function (resolve, reject) {
        if (openIndexedDBReq) {
          openIndexedDBReq.result.close();
        }
        var req = indexedDB.deleteDatabase('test_idb');
        req.onsuccess = resolve;
        req.onerror = reject;
        req.onblocked = reject;
      }),
      Promise.resolve().then(function () {
        if (typeof localforage !== 'undefined') {
          return localForageDB.clear();
        }
      }),
      Promise.resolve().then(function () {
        if (typeof openDatabase !== 'undefined' &&
            typeof localforage !== 'undefined') {
          return localForageWebSQLDB.clear();
        }
      }),
      dexieDB.delete().then(function () {
        dexieDB = new Dexie('dexie_test');
        dexieDB.version(1).stores({ docs: '++,id'});
        dexieDB.open();
      }),
      pouch.destroy().then(function () {
        pouch = new PouchDB('pouch_test');
      }),
      Promise.resolve().then(function () {
        if (!pouchWebSQL.adapter) {
          return Promise.resolve();
        }
        return pouchWebSQL.destroy().then(function () {
          pouchWebSQL = new PouchDB('pouch_test_websql', {adapter: 'websql'});
        });
      }),
      Promise.resolve().then(function () {
        if (typeof document === 'undefined') {
          return Promise.resolve(); // don't run inside a worker
        }
        return pouchWorker.destroy().then(function () {
          pouchWorker = new PouchDB('pouch_test_worker', {adapter: 'worker'});
        });
      })
    ];

    return Promise.all(promises);
  }

  return {
    getTest: getTest,
    cleanup: cleanup,
    createDocs: createDocs
  }
}
