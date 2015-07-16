'use strict';

let _ = require('underscore');
let test = require('tape');

let LevelUp = require('levelup');

let Common = require('../common');
let Sinon = require('sinon');

let LeveldbUtils = require('../../lib/entity_set_level/utils');
let defaultOptions = { location: '/tmp/test.ldb', clear:true };


test('creating reuseable ids sequentially', t => {
    let db;
    return LeveldbUtils.openDb( defaultOptions )
        .then( (_db) => { db = _db; return LeveldbUtils.createReuseableId(db, null, '_test_key')} )
        // create 5 ids. note how the id creation is sequential even though Promise.all is parallel
        .then( testKey => Promise.all( _.times(5, () => testKey.get()) ) )
        .then( ids => {
            t.deepEqual( ids, [0,1,2,3,4], 'should have 5 ids' );
        })
        .then( () => LeveldbUtils.closeDb(db) )
        .then( () => t.end() )
        .catch( err => { log.debug('error: ' + err ); log.debug( err.stack );} )
});

test('reuseable ids are persistent', t => {
    let db;
    return LeveldbUtils.openDb( defaultOptions )
        .then( (_db) => { db = _db; return LeveldbUtils.createReuseableId(db, null, '_test_key')} )
        // create 5 ids. note how the id creation is sequential even though Promise.all is parallel
        .then( testKey => Promise.all( _.times(5, () => testKey.get()) ) )
        .then( () => LeveldbUtils.closeDb(db) )
        // reopen
        .then( () => LeveldbUtils.openDb(_.extend({},defaultOptions,{clear:false})) )
        .then( (_db) => { db = _db; return LeveldbUtils.createReuseableId(db, null, '_test_key')} )
        // create 5 new ids - the sequence should be preserved
        .then( testKey => Promise.all( _.times(5, () => testKey.get()) ) )
        .then( ids => t.deepEqual( ids, [5,6,7,8,9], 'should have 5 ids') )
        // finish
        .then( () => LeveldbUtils.closeDb(db) )
        .then( () => t.end() )
        .catch( err => { log.debug('error: ' + err ); log.debug( err.stack );} ) 
})

test('reuseable ids', t => {
    let db, testKey;

    return LeveldbUtils.openDb( defaultOptions )
        .then( (_db) => { 
            db = _db; 
            return LeveldbUtils.createReuseableId(db, null, '_test_key', 123)
                .then( (ruid) => testKey = ruid)
        })
        
        // create 6 ids
        .then( () => Promise.all( _.times(6, (v) => testKey.get(v)) ) )
        // release the first 3
        .then( values => {
            t.deepEqual( values, [123,124,125,126,127,128] );
            return Promise.all(  values.slice(0,3).map( (id) => testKey.release(id))) 
        })
        .then( values => {
            return t.deepEqual( values, [123,124,125] );
        })
        // get 4 more
        // .then( () => testKey.clear() )
        .then( () => Promise.all( _.times(4, (v) => testKey.get(v)) ) )
        
        .then( (values) => {
            // the result is the 3 that were previously released, plus a new id
            return t.deepEqual( values, [123,124,125,129] );
        })
        .then( () => LeveldbUtils.closeDb(db) )
        .then( () => t.end() )
        .catch( err => { log.debug('error: ' + err ); log.debug( err.stack );} )
});

test('opening with memdown', t => {
    let db;
    let options = _.extend( {}, defaultOptions, {db: require('memdown')});

    return LeveldbUtils.openDb( options )
        .then( _db => db = _db )
        .then( () => LeveldbUtils.closeDb(db) )
        .then( () => t.end() )
        .catch( err => { log.debug('error: ' + err ); log.debug( err.stack );} )
});



