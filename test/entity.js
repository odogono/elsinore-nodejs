import test from 'tape';
import _ from 'underscore';

import {
    Component, Entity, EntitySet,
    Registry,
    initialiseRegistry, 
    loadEntities, 
    loadComponents, loadFixtureJSON,
    printE,
    printIns,
    logEvents,
    requireLib,
    getEntityIdFromId,
    getEntitySetIdFromId,
    setEntityIdFromId,
    createLog,
    entityToString,
} from './common';
import { isComponent, isEntity, isEntitySet } from '../src/util/is';


const Log = createLog('TestEntity');

test('is an entity', t => {
    let e = Entity.create();
    t.equals( e.type, 'Entity' );
    t.equals( Entity.prototype.type, 'Entity' );
    t.ok( isEntity(e) );
    t.end();
});


test('setting the id', t => {
    let e = Entity.create({'@e':456});
    // let e = Entity.create( 456 );
    
    t.equals( e.getEntityId(), 456 );
    e.setEntityId( 22 );
    t.equals( e.getEntityId(), 22 );
    t.equals( e.id, 22 );

    e.setEntityId(54);
    t.equals( e.getEntityId(), 54 );
    t.equals( e.getEntitySetId(), 0 );

    e.setEntityId(0);
    e.setEntitySetId( 2000 );
    t.equals( e.getEntitySetId(), 2000 );
    t.equals( e.getEntityId(), 0 );

    e.setEntityId( 2147483647 );
    t.equals( e.getEntityId(), 2147483647 );

    e.setEntitySetId( 2097151 );
    t.equals( e.getEntitySetId(), 2097151 );
    t.equals( e.getEntityId(), 2147483647 );

    t.end();
});

test('setting the id directly', t => {
    let e = Entity.create({id:2005});
    t.equals( e.getEntityId(), 2005 );
    t.end();
});

test('passing entity id in options', t => {
    let e = Entity.create({'@e': 1622});
    t.equals( e.getEntityId(), 1622 );
    t.end();
});

test('setting ids', t => {
    let id = 0;
    t.equals( getEntityIdFromId( id ), 0 );
    t.equals( getEntitySetIdFromId( id ), 0 );

    id = setEntityIdFromId( 872510, 3467 );
    t.equals( getEntityIdFromId( id ), 872510 );
    t.equals( getEntitySetIdFromId( id ), 3467 );        

    t.end();
});

test('setting entity set', t => {
    let e = Entity.create();
    e.setEntityId( 22 );
    e.setEntitySetId( 103 );

    let es = { id:0, getRegistry:() => new Registry() };
    e.setEntitySet( es );

    t.equals( e.getEntityId(), 22 );
    t.equals( e.getEntitySetId(), 0 );

    t.end();
})

test('hashing', t => {
    let e = Entity.create();
    // because an entity is the sum of its components, without components it is nothing
    t.equals( e.hash(), 0 );

    let c = createComponent({name:'douglas'});
    e.addComponent( c );

    t.equals( e.hash(true), '7c7ecfd3' );

    let oe = Entity.create();
    let oc = createComponent({name:'douglas'});
    oe.addComponent( oc );

    t.equals( e.hash(), oe.hash() );

    t.end();
});

test('toJSON with full options', t => {
    let e = Entity.create();
    let c = createComponent({name:'douglas'});
    e.addComponent( c );

    let json = e.toJSON();

    t.deepEquals( e.toJSON(), [ { '@s':1, name: 'douglas' } ] );
    t.end();
});

test('adding a component of the same type replaces', t => {
    let e = Entity.create();
    let c = Component.create({ '@s':1, '@c':'/component/name', name:'douglas'});

    e.addComponent( c );

    e.addComponent( Component.create({ '@s':1, name:'fred'}) );

    t.deepEquals( e.toJSON(), [ { '@s':1, name: 'fred' } ] );

    t.end();
})




function createComponent( properties ){
    properties = {'@s':1,'@c':'/component/name', ...properties};
    return new Component(properties);
}