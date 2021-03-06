var Dispatcher = require('../dispatcher/Dispatcher.js');
var Constants = require('../constants/Constants.js');
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');

var ActionTypes = Constants.ActionTypes;

var CHANGE_EVENT = 'change';
var DELETE_EVENT = 'delete';

var _databases = JSON.parse(localStorage.getItem('databaseList'));
var _errors = [];

var ExternalDatabaseStore = assign({}, EventEmitter.prototype, {
    emitChange: function() {
        this.emit(CHANGE_EVENT);
    },
    
    emitDelete: function() {
        this.emit(DELETE_EVENT);
    },

    addChangeListener: function(callback) {
        this.on(CHANGE_EVENT, callback);
    },

    removeChangeListener: function(callback) {
        this.removeListener(CHANGE_EVENT, callback);
    },
    
    addDeleteListener: function(callback) {
        this.on(DELETE_EVENT, callback);
    },

    removeDeleteListener: function(callback) {
        this.removeListener(DELETE_EVENT, callback);
    },
    
    getErrors: function() {
        return _errors;
    },
    
    getDbs: function() {
        return _databases;
    }
});

ExternalDatabaseStore.dispatchToken = Dispatcher.register(function(payload) {
    var action = payload.action;
    
    switch(action.type) {
        case ActionTypes.GET_DBS:
            if(action.errors)
            {
                _errors = action.errors;
            }
            else if(action.json)
            {
                _errors = []; // empty old errors
                _databases = action.json;
                localStorage.setItem('databaseList',JSON.stringify(action.json));
            }
            ExternalDatabaseStore.emitChange();
            break;
            
        case ActionTypes.ADD_EXT_DB_RESPONSE:
            if(action.errors)
            {
                _errors = action.errors;
            }
            else if(action.database)
            {
                _errors = []; // empty old errors
                _databases.push(action.database);
            }
            ExternalDatabaseStore.emitChange();
            break;
            
        case ActionTypes.DELETE_DB_RESPONSE:
            if(action.errors)
            {
                _errors.push(action.errors);
            }
            else
            {
                _errors = [];
                var trovato = false;
                for (var i = 0; !trovato &&  i < _databases.length; i++)
                {
                    if (_databases[i].id == action.id)
                    {
                        _databases.splice(i,1);
                        trovato = true;
                    }
                }
            }
            ExternalDatabaseStore.emitChange();
            break;
        
        case ActionTypes.DELETE_ALL_SELECTED_DATABASES_RESPONSE:
            if(action.errors)
            {
                _errors.push(action.errors);
            }
            else
            {
                _errors = [];
                var count = 0;
                for (var i = 0; count < action.arrayId.length && i <_databases.length; i++)
                {
                    for (var j = 0; j < action.arrayId.length; j++)
                    {
                        if(_databases[i].id == action.arrayId[j])
                        {
                            _databases.splice(i,1);
                            count++;
                        }
                    }
                }
            }
            ExternalDatabaseStore.emitChange();
            break;
            
        case ActionTypes.CHANGE_STATE_DB:
            if (action.errors)
            {
                _errors = action.errors;
            }
            else if(action.json)
            {
                _errors = [];
                _databases.forEach(function(database,i) {
                    if (database.id == action.json.id)
                    {
                        database.connected = action.json.connected;
                    }
                });
            }
            ExternalDatabaseStore.emitChange();
            break;
    }
});

module.exports = ExternalDatabaseStore;