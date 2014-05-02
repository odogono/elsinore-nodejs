require('./common');

var _ = require('underscore');
var Backbone = require('backbone');
var Promise = require('bluebird');

var Registry = Elsinore.Registry;
var MemoryStorage = require('../index');
var ComponentDef = Elsinore.ComponentDef;
var Entity = Elsinore.Entity;

var testOptions = {};

describe('MemoryStorage', function(){

    describe('Entity', function(){

        beforeEach( function(){
            var self = this;
            return createAndInitialize(testOptions).then(function(storage){ self.storage = storage; });
        });

        afterEach( function(){
        });

        it('should create an entity with an id', function(){
            var entity = createEntity();
            expect( entity.isNew() ).to.be.true;
            return this.storage.createEntity( entity )
                .then( function(entity){
                    expect( entity.isNew() ).to.be.false;
                })
        });

        it('should create an array of entities', function(){
            var entities = createEntities(3);
            return this.storage.createEntity( entities )
                .then( function(result){
                    result.should.be.an('array');
                    expect( result[0].isNew() ).to.be.false;
                    expect( result[1].isNew() ).to.be.false;
                    expect( result[2].isNew() ).to.be.false;
                });
        });

        it('should create an entity with a predefined id', function(){
            var entity = createEntity(34);
            expect( entity.isNew() ).to.be.false;
            return this.storage.createEntity( entity )
                .then( function(entity){
                    expect( entity.id ).to.equal(34);
                });
        })

        it('should throw an error when attempting to create an entity with an existing id', function(){
            var self = this;
            var entity = createEntity(35);
            return this.storage.createEntity( entity )
                .then( function(result){
                    return self.storage.createEntity( entity ).should.be.rejectedWith( Error, 'entity 35 already exists');
                });
        });

        it('should retrieve an existing entity by its id', function(){
            var self = this;
            var entity = createEntity(36);

            return this.storage.createEntity(entity)
                .then( function(entity){
                    return self.storage.retrieveEntity( {id:36} );
                }).then( function(entity){
                    expect( entity.id ).to.equal( 36 );
                });
        });

        it('should throw an error when retrieving an entity with an unknown id', function(){
            return this.storage.retrieveEntity( {id:37} ).should.be.rejectedWith( Error, 'entity 37 not found' );
        });

        it('should know that an entity exists', function(){
            var self = this;
            var entity = createEntity(38);
            return this.storage.createEntity(entity)
                .then( function(entity){
                    return self.storage.hasEntity( {id:38} ).should.eventually.equal( true );
                });
        });

        it('should know that an entity does not exist', function(){
            return this.storage.hasEntity( {id:39} ).should.eventually.equal( false );
        });


        describe('destroying an entity', function(){
            beforeEach( function(){
                var entity = createEntity(981);
                return this.storage.createEntity(entity);
            });

            it('should destroy an entity', function(){
                var self = this;
                return self.storage.destroyEntity( {id:981} )
                    .then( function(){
                        return self.storage.hasEntity( {id:981} ).should.eventually.equal( false );
                    });
            });

            it('should emit an event when the entity is destroyed', function(){
                var eventSpy = sinon.spy();
                this.storage.on('entity:destroy', eventSpy);

                return this.storage.destroyEntity({id:981})
                    .then( function(){
                        expect(eventSpy.called).to.be.ok;
                        eventSpy.getCall(0).args[0].should.equal( 981 );
                    });
            });
        });

    });

});


function createAndInitialize(options){
    var registry = Registry.create();
    return registry.initialize()
        .then( function(registry){
            return registry.storage;
        });
}

function createEntity(id){
    return Entity.create(id);
}

function createEntities( count ){
    return _.times( count, function(i){ return createEntity() });
}