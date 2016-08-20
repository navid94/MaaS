var app = require('../../server/server.js');
var sweet = require('sweet.js');
var fs = require('fs');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var DocumentSchema = new Schema({}, {strict: false});
var CompileErrors = require('./compileErrors.js');
var AttributesReader = require('./attributesReader.js');

module.exports = function(DSL) {
    // Create a DSL definition
    DSL.saveDefinition = function(userId, type, name, source, externalDatabaseId, cb) {
        
        // Clear and returns the error
        function relationError(DSLInstance, err) {
            DSL.destroyById(DSLInstance.id, function(err) {
                if(err) 
                    return cb(err, null, null);
            });
            console.log("> Error creating relationship for the DSL");
            return cb(err, null, null);
        }
        
        if(!type || !name)
        {
            var error = {
                message: "Missing data for DSL creation"
            };
            return cb(null, error, null);
        }
        DSL.create({type: type, name: name, source: source, createdBy: userId, externalDatabaseId: externalDatabaseId}, function(err, DSLInstance) {
            if(err || !DSLInstance)
            {
               console.log('> Failed creating DSL.');
               return cb(err);
            }
            // Define relation between user and DSL
            var DSLAccess = app.models.DSLAccess;
            var user = app.models.user;
            user.findById(userId, function(err, userInstance) {
                if(err)
                {
                    relationError(DSLInstance, err);
                }
                var Company = app.models.Company;
                Company.findById(userInstance.companyId, function(err, company) {
                    if(err || !company)
                        return cb(err, null, null);
                    // Add DSL to the Admins of the company
                    company.users({where: {role: "Administrator"}}, function(err, admins) {
                        if(err || !admins)
                            return cb(err, null, null);
                        admins.forEach(function(admin, i) 
                        {
                            DSLAccess.create({userId: admin.id, dslId: DSLInstance.id, permission: "write"}, function(err, accessInstance) {
                                if(err)
                                    return relationError(DSLInstance, err);
                            });
                        });
                    });
                    // Add DSL to the Owner of the company
                    company.owner(function(err, owner) {
                        if(err)
                        {
                            return relationError(DSLInstance, err);
                        }
                        DSLAccess.create({userId: owner.id, dslId: DSLInstance.id, permission: "write"}, function(err, accessInstance) {
                            if(err)
                                return relationError(DSLInstance, err);
                        });
                    });
                    // If user creating the DSL is not Owner or Admin add DSL to him
                    if(userInstance.role == "Member")
                    {
                        DSLAccess.create({userId: userInstance.id, dslId: DSLInstance.id, permission: "write"}, function(err, accessInstance) {
                            if(err)
                                return relationError(DSLInstance, err);
                        });
                    }
                    console.log("> Created DSL:", DSLInstance.id);
                    return cb(null, null, DSLInstance);
                });
            });
       });
    };
    
    DSL.remoteMethod(
        'saveDefinition',
        {
            description: "Change user's editor configuration options",
            accepts: [
                { arg: 'userId', type: 'string', required: true, description: 'User id' },
                { arg: 'type', type: 'string', required: true, description: 'Definition type' },
                { arg: 'name', type: 'string', required: true, description: 'Definition name' },
                { arg: 'source', type: 'string', required: true, description: 'Definition source' },
                { arg: 'externalDatabaseId', type: 'string', required: true, description: 'External DatabaseId id' }
            ],
            returns: [
                { arg: 'error', type: 'Object' },
                { arg: 'definition', type: 'Object'}
            ],
            http: { verb: 'post', path: '/saveDefinition' }
        }
    );
    
    DSL.overwriteDefinition = function(id, type, source, name, cb) {
        DSL.findById(id, function(err, DSLInstance) {
            if(err)
            {
                return cb(err, null, null);
            }
            DSLInstance.updateAttributes({type: type, source: source, name: name}, function(err, newDSL) {
                if(err)
                {
                    return cb(err, null, null);
                }
                console.log("> Updated DSL:", newDSL.id);
                return cb(null, null, newDSL);
            });
        });
    };
    
    DSL.remoteMethod(
        'overwriteDefinition',
        {
            description: "Change user's editor configuration options",
            accepts: [
                { arg: 'id', type: 'string', required: true, description: 'Definition id' },
                { arg: 'type', type: 'string', required: true, description: 'Definition type' },
                { arg: 'source', type: 'string', required: true, description: 'Definition source' },
                { arg: 'name', type: 'string', required: true, description: 'Definition name' }
            ],
            returns: [
                { arg: 'error', type: 'Object' },
                { arg: 'definition', type: 'Object'}
            ],
            http: { verb: 'put', path: '/:id/overwriteDefinition' }
        }
    );
    
    DSL.deleteDefinition = function(id, cb) {
        DSL.findById(id, function(err, DSLInstance) {
            if (err)
            {
                return cb(err, null);
            }
            DSLInstance.users({ where: {} }, function(err, users) {
                if(err)
                {
                    return cb(err, null);
                }
                users.forEach(function(user, i) {
                    DSLInstance.users.remove(user, function(err) {
                        if(err)
                        {
                            console.log("> Error deleting DSL definition");
                            return cb(err, null);
                        }
                    });
                });
                // Success
                DSL.destroyById(DSLInstance.id, function(err) {
                    if(err) 
                    {
                        return cb(err, null);
                    }
                    console.log("> DSL definition deleted:", id);
                    return cb(null, null);
                });
                
            });
                
        });
    };
    
    DSL.remoteMethod(
        'deleteDefinition',
        {
            description: "Delete one DSL definition and its relationships",
            accepts: [
                { arg: 'id', type: 'string', required: true, description: 'Definition id' }
            ],
            returns: [
                { arg: 'error', type: 'Object' }
            ],
            http: { verb: 'delete', path: '/:id/deleteDefinition' }
        }
        
    );
    
    DSL.changeDefinitionPermissions = function(id, userId, permission, cb) {
        var DSLAccess = app.models.DSLAccess;
        var user = app.models.user;
        DSLAccess.findOne({where: {userId: userId, dslId: id}, limit: 1}, function(err, accessInstance) {
            if(err)
            {
                return cb(err);
            }
            user.findById(userId, function(err, userInstance) {
               if(err)
               {
                   return cb(err);
               }
               // User has access to dsl
                if(accessInstance) 
                {
                    if(permission == "none")
                    {
                        userInstance.permission = accessInstance.permission;
                        DSLAccess.destroyById(accessInstance.id, function(err) {
                            if(err)
                            {
                                return cb(err);
                            }
                            console.log("> Permission removed for DSL:", id);
                            return cb(null, null, 'delete', userInstance);
                        });
                    }
                    else
                    {
                        accessInstance.permission = permission;
                        userInstance.permission = accessInstance.permission;
                        accessInstance.save();
                        console.log("> Permission changed for DSL:", id);
                        return cb(null, null, 'update', userInstance);
                    }
                }
                else // User don't have access to dsl
                {
                    DSLAccess.create({userId: userId, dslId: id, permission: permission}, function(err, newAccessInstance) {
                        if(err)
                        {
                            return cb(err);
                        }
                        userInstance.permission = newAccessInstance.permission;
                        console.log("> Permission changed for DSL:", id);
                        return cb(null, null,'create', userInstance);
                    });
                }
            });
            
        });
    };
    
    DSL.remoteMethod(
        'changeDefinitionPermissions',
        {
            description: "Change the permissions for one specific DSL definition",
            accepts: [
                { arg: 'id', type: 'string', required: true, description: 'Definition id' },
                { arg: 'userId', type: 'string', required: true, description: 'User id' },
                { arg: 'permission', type: 'string', required: true, description: 'Definition permission' }
            ],
            returns: [
                { arg: 'error', type: 'Object' },
                { arg: 'operation', type: 'string' },
                { arg: 'userPermission', type: 'Object' }
                
            ],
            http: { verb: 'put', path: '/:id/changeDefinitionPermissions' }
        }
        
    );
    
    DSL.compileDefinition = function(id, cb) {
        var ExternalDatabase = app.models.ExternalDatabase;
        DSL.findById(id, function(err, DSLInstance) {
            if(err)
            {
                console.log(err);
                return cb(err);
            }
            
            ExternalDatabase.findById(DSLInstance.externalDatabase, function(err, database) {
                if(err)
                {
                   console.log("> Error finding database of dsl");
                   return cb(err);
                }
               
                var conn = mongoose.connect(database.connString, function(err) {
                    if (err)
                    {
                        var error = {
                            message: "Failed connecting database"
                        };
                        console.log('> Failed connecting database.');
                        return cb(null, error, null);
                    }
                });
               
                DSL.compile(DSLInstance.source, function(err, expanded) {
                    if(err)
                    {
                        console.log("> DSL compilation error:", err);
                        conn.disconnect();
                        return cb(null, err);
                    }
                    var callback = function(err, identity, body) {
                        if(err)
                        {
                            conn.disconnect();
                            return cb(null, err);
                        }
                        conn.disconnect();
                        console.log('> DSL compilation processed successfully');
                        return cb(null, null);
                    };
                    try
                    {
                        eval(expanded); // DSL.compileCell({...})
                    }
                    catch(err)
                    {
                        conn.disconnect();
                        console.log("> DSL compilation error:", err);
                        return cb(null, err.toString());
                    }
                });
            });
        });
    };
    
    DSL.remoteMethod(
        'compileDefinition',
        {
            description: "Compile a DSL definition",
            accepts: [
                { arg: 'id', type: 'string', required: true, description: 'Definition id' }
            ],
            returns: [
                { arg: 'error', type: 'Object' }
            ],
            http: { verb: 'post', path: '/:id/compileDefinition' }
        }
    );
    
    /*
    
    Compilo -> compileDefinition -> compile -> macro -> compileXXX -> err / null
    
    Eseguo -> executeDefinition -> compile -> macro -> compileXXX -> err / null
                                -> executeXXX -> err / result
                                                    
    */
    
    DSL.executeDefinition = function(id, cb) {
        var ExternalDatabase = app.models.ExternalDatabase;
        DSL.findById(id, function(err, DSLInstance) {
            if(err)
            {
                console.log(err);
                return cb(err);
            }
            
            ExternalDatabase.findById(DSLInstance.externalDatabase, function(err, database) {
                if(err)
                {
                   console.log("> Error finding database of dsl");
                   return cb(err);
                }
               
                var conn = mongoose.connect(database.connString, function(err) {
                    if (err)
                    {
                        var error = {
                            message: "Failed connecting database"
                        };
                        console.log('> Failed connecting database.');
                        return cb(null, error, null);
                    }
                });
                
                DSL.compile(DSLInstance.source, function(err, expanded) {
                    if(err)
                    {
                        console.log("> DSL compilation error:", err);
                        conn.disconnect();
                        return cb(null, err, null);
                    }
                    
                    var callback = function(err, identity, body) {
                        if(err)
                        {
                            conn.disconnect();
                            console.log("> DSL execution stopped: compilation errors");
                            return cb(null, err, null);
                        }
                        else
                        {
                            switch(DSLInstance.type)
                            {
                                case "Cell":
                                    DSL.executeCell(identity, body, conn, function(error, data){
                                        conn.disconnect();
                                        if(error)
                                        {
                                            console.log("> DSL execution error:", error);
                                            return cb(null, error, null);
                                        }
                                        else
                                        {
                                            console.log("> DSL execution processed successfully");
                                            if(!data.label)
                                                data.label = DSLInstance.name;
                                            data.DefinitionType = DSLInstance.type;
                                            return cb(null, null, data);
                                        }
                                    });
                                    break;
                                case "Document":
                                    DSL.executeDocument(identity, body, conn, function(error, data) {
                                        if (error)
                                        {
                                            console.log("> DSL execution error:", error);
                                            return cb(null, error, null);
                                        }
                                        else
                                        {
                                            console.log("> DSL execution processed successfully");
                                            
                                            return cb(null, null, data);
                                        }
                                    });
                                    break;
                            }
                        }
                    };
                    try
                    {
                        eval(expanded); // DSL.compileCell({...})
                    }
                    catch(err)
                    {
                        conn.disconnect();
                        console.log("> DSL execution stopped:", err);
                        return cb(null, err.toString(), null);
                    }
                });
            });
        });
    };
    
    DSL.remoteMethod(
        'executeDefinition',
        {
            description: "Execute a DSL definition",
            accepts: [
                { arg: 'id', type: 'string', required: true, description: 'Definition id' }
            ],
            returns: [
                { arg: 'error', type: 'Object' },
                { arg: 'data', type: 'Object' }
            ],
            http: { verb: 'post', path: '/:id/executeDefinition' }
        }
    );
    
    DSL.compile = function(dsl, cb) {
        var intepreterFile = __dirname + "/macro.sjs";
        var expanded;
        fs.readFile(intepreterFile, function(err, macro) {
            if(err)
            {
                console.log("> Errore:", err);
                return cb(err, null);
            }
            else
            {
                macro = macro.toString();
                try
                {
                    expanded = sweet.compile(macro + dsl);
                }
                catch(err)
                {
                    console.log("CATCH:", err);
                    var message;
                    if(!err.description)
                    {
                        //Default message
                        message = "DSL compilation error";
                        if(err.toString().match(/replacement values for syntax template must not be null or undefined/g))
                        {
                            message = "Syntax error. Unknown keyword or missing comma";
                        }
                        if(err.toString().match(/Unexpected syntax/g))
                        {
                            if(err.toString().match(/List \[ {/g))
                                message = "Unexpected syntax: \"{\". Wrong use of parenthesis";
                            if(err.toString().match(/List \[ \[/g))
                                message = "Unexpected syntax: \"[\". Wrong use of parenthesis";
                            if(err.toString().match(/List \[ \(/g))
                                message = "Unexpected syntax: \"(\". Wrong use of parenthesis";
                        }
                        if(err.toString().match(/expecting a : punctuator/g))
                        {
                            message = "Syntax error: missing \":\"";
                        }
                    }
                    else
                    {
                        message = err.description;
                    }
                    
                    return cb(message, null);
                    // errore virgole: [Error: replacement values for syntax template must not be null or undefined] 
                }
                return cb(null, expanded.code);
            }
        });
    };
    
    
    DSL.remoteMethod(
        'compile',
        {
            description: "Compile one DSL definition",
            accepts: [
                { arg: 'source', type: 'string', required: true, description: 'Definition source' }
            ],
            returns: [
                { arg: 'err', type: 'string' },
                { arg: 'expanded', type: 'string' }
                
            ],
            isStatic: true
        }
    );
    
    DSL.compileCell = function(identity, body, cb) {
        /*
        Two types of cell:
        
        1) Cell with value:
            Identity:
                type | required | "string"
                label | optional
                columnLabel | optional
                transformation | optional
            Body:
                value | required
        
        2) Cell without value:
            Identity:
                name | required
                table | required
                label | optional
                transformation | optional
                columnLabel | optional
                type | required | "string"
                sortby | optional
                order | optional | "asc"
                query | optional
            Body:
                empty
        */
        if(Object.getOwnPropertyNames(body).length !== 0)   // Cell with a value
        {
            AttributesReader.checkSupportedAttributes(Object.assign(identity, body), ['type', 'label', 'columnLabel', 'transformation', 'value'], function(unsupportedAttributesError) {
                AttributesReader.readRequiredAttributes(body, ['value'], function(missingRequiredBodyAttributesError) {
                    AttributesReader.readRequiredAttributes(identity, ['type', 'columnLabel'], function(missingRequiredIdentityAttributesError) {
                        AttributesReader.checkCellKeywordValue({type: identity.type, transformation: identity.transformation, value: body.value}, function(keywordValueError) {
                            var error = Object.assign(unsupportedAttributesError, missingRequiredBodyAttributesError, missingRequiredIdentityAttributesError, keywordValueError);
                            if(Object.getOwnPropertyNames(error).length !== 0)
                            {
                                return cb(error, null, null);
                            }
                            else
                            {
                                return cb(null, identity, body);
                            }
                        });
                    });
                });
            });
        }
        else    // Cell without a value
        {
            AttributesReader.checkSupportedAttributes(Object.assign(identity, body), ['name', 'table', 'label', 'columnLabel', 'transformation', 'type', 'sortby', 'order', 'query'], function(unsupportedAttributesError) {
                AttributesReader.readRequiredAttributes(identity, ['type', 'name', 'table'], function(missingRequiredIdentityAttributesError) {
                    var keywordsValue = {
                        type: identity.type, 
                        transformation: identity.transformation, 
                        order: identity.order, 
                        query: identity.query,
                        name: identity.name,
                        columnLabel: identity.columnLabel,
                        table: identity.table,
                        sortby: identity.sortby,
                        label: identity.label
                    };
                    AttributesReader.checkCellKeywordValue(keywordsValue, function(keywordValueError) {
                        var error = Object.assign(unsupportedAttributesError, missingRequiredIdentityAttributesError, keywordValueError);
                        if(Object.getOwnPropertyNames(error).length !== 0)
                        {
                            return cb(error, null, null);
                        }
                        else
                        {
                            return cb(null, identity, body);
                        }
                    });
                });
            });
        }
    };
    
    DSL.remoteMethod(
        'compileCell',
        {
            description: "Compile a Cell macro",
            isStatic: true,
            accepts : [
                { arg: 'identity', type: 'object', required: true, description: 'Cell identity' },
                { arg: 'body', type: 'object', required: true, description: 'Cell body' }
            ],
            returns: [
                { arg: 'error', type: 'Object' },
                { arg: 'identity', type: 'Object' },
                { arg: 'body', type: 'Object' }
            ]
        }
        
    );
    
    DSL.executeCell = function(identity, body, conn, cb) {
        var data = {};
        if(Object.getOwnPropertyNames(body).length === 0)   // cell without value
        {
            var collection = conn.model(identity.table, DocumentSchema);
            var mongoose_query;
            if(identity.query)
            {
                console.log(identity.query);
                mongoose_query = collection.find(identity.query, { _id: 0});
            }
            else
            {
                mongoose_query = collection.find({}, { _id: 0});
            }
            mongoose_query.setOptions({lean: true});
            mongoose_query.select(identity.name);
            if(identity.order)
            {
                if(identity.sortby)
                {
                    mongoose_query.sort({[identity.sortby]: identity.order == "asc" ? 1 : -1});
                }
                else
                {
                    mongoose_query.sort({[identity.name]: identity.order == "asc" ? 1 : -1});
                }
            }
            else
            {
                if(identity.sortby)
                {
                    mongoose_query.sort({[identity.sortby]: 1});
                }
            }
            mongoose_query.limit(1);
            mongoose_query.exec(function(err, result) {
                if (err)
                {
                    return cb(err, null);
                }
                if(result.length > 0)
                {
                    var keywordsValue = {
                      type: identity.type,
                      value: result[0][identity.name]
                    };
                    
                    AttributesReader.checkCellKeywordValue(keywordsValue, function(keywordValueError) {
                        if(Object.getOwnPropertyNames(keywordValueError).length !== 0)
                        {
                            return cb(keywordValueError, null);
                        }
                        else
                        {
                            if(identity.label)
                            {
                                data.label = identity.label;
                            }
                            if (identity.columnLabel)
                            {
                                data.result = [
                                    {
                                       [identity.columnLabel]: result[0][identity.name]
                                    }
                                ];
                            }
                            else
                            {
                                data.result = result;
                            }
                            return cb(null, data);
                        }
                    });
                }
                else
                {
                    return cb(null, data);
                }
            });
        }
        else    // cell with value
        {
            var columnLabel = identity.columnLabel;
            var value = body.value;
            if(identity.label)
            {
                data.label = identity.label;
            }
            data.type = identity.type;
            if(identity.transformation)
            {
                var transformedValue;
                try
                {
                    transformedValue = identity.transformation(value);
                }
                catch(err)
                {
                    return cb(err, null);
                }
                AttributesReader.checkCellKeywordValue({ type: identity.type, value: transformedValue }, function(keywordValueError) {
                    if(Object.getOwnPropertyNames(keywordValueError).length !== 0)
                    {
                        return cb(keywordValueError, null);
                    }
                    else
                    {
                        data.result = [
                            {
                               [columnLabel]: transformedValue
                            }
                        ];
                        return cb(null, data);
                    }
                });
            }
            else
            {
                data.result = [
                    {
                       [columnLabel]: value
                    }
                ];
                return cb(null, data);
            }
        }
    };
    
    DSL.remoteMethod(
        'executeCell',
        {
            description: "Execute a Cell macro",
            isStatic: true,
            accepts : [
                { arg: 'identity', type: 'object', required: true, description: 'Cell identity' },
                { arg: 'body', type: 'object', required: true, description: 'Cell body' }
            ],
            returns: [
                { arg: 'error', type: 'Object' },
                { arg: 'data', type: 'Object' }
            ]
        }
    );
    /*
    Collection(
    
    ) {
        Index (
        
        
        ) {
            column (
            
            )
            column (
            
            )
        }
        Document() {
            
            row (
            
            )
            row (
            
            )
        }
    }
    
    
    compileCollection(identity, body, cb) {
        
        
        {DSL.compileDocument()}
    }
    
    compileDocument(identity, body, cb) {
        
        body == [{row1}, {row2}]
        body.forEach(function(row){
            AtrrRead.check(row, function(err) {
                
            })
        })
    }
    
    */
    
    
    
    /*
   Document ( 
        table: 'users',
        label: 'Users',
        sortby: 'surname',
        order: 'asc',
        query: {age : { $lt : 40}}
    ) {
        row(
            name: 'surname',
            label: 'Surname',
            type: 'string'
        )
        row(
            name: 'name',
            label: 'Name',
            type: 'string'
        )
        row(
            name: 'orders',
            label: 'Orders',
            type: 'number',
            transformation: function(val) { return val.length; }
        )
    }
    
    
    two types of independent Document:
    
    1)
    
        Identity:
            table | required
            label | optional
            sortby | optional
            order | optional | asc
            query | optional
        Body:
            row
    Row:
        Identity:
            name | required
            label | optional
            transformation | optional
            type | required
    
    2)
    
        Identity:
            table | required
            label | optional
            sortby | optional
            order | optional | asc
            query | optional
        Body:
            empty
            
    two types of Document inside Collection:
    
    1)
        Identity:
            populate | optional
        Body:
            row
    Row:
        Identity:
            name | required
            label | optional
            transformation | optional
            type | required
            
    2)
    
        Identity:
            populate | optional
        Body:
            empty
    
        
    
    */
    
    DSL.compileDocument = function(identity, body, cb) {
        
            AttributesReader.checkSupportedAttributes(identity, ['table', 'label', 'sortby', 'query', 'order'], function(unsupportedIdentityAttributesError) {
                AttributesReader.readRequiredAttributes(identity, ['table'], function(missingRequiredIdentityAttributesError) {
                    var keywords = {
                        table: identity.table,
                        label: identity.label,
                        sortby: identity.sortby,
                        order: identity.order,
                        query: identity.query
                    };
                    AttributesReader.checkDocumentKeywordValue(keywords, function(identityKeywordValueError) {
                        if(body.length !== 0)   // Document with rows
                        {
                            body.forEach(function(row) {
                                AttributesReader.checkSupportedAttributes(row, ['name', 'label', 'transformation', 'type'], function(unsupportedRowAttributesError) {
                                    AttributesReader.readRequiredAttributes(row, ['name', 'type'], function(missingRequiredRowAttributesError) {
                                        var keywords = {
                                            name: row.name,
                                            label: row.label,
                                            transformation: row.transformation,
                                            type: row.type
                                        };
                                        AttributesReader.checkDocumentKeywordValue(keywords, function(rowKeywordValueError) {
                                            var error = Object.assign(unsupportedIdentityAttributesError, missingRequiredIdentityAttributesError, 
                                            identityKeywordValueError, unsupportedRowAttributesError, missingRequiredRowAttributesError, rowKeywordValueError);
                                            if(Object.getOwnPropertyNames(error).length !== 0)
                                            {
                                                return cb(error, null, null);
                                            }
                                            else
                                            {
                                                return cb(null, identity, body);
                                            }
                                        });
                                    });
                                });
                            });
                        }
                        else    //Document without rows
                        {
                            var error = Object.assign(unsupportedIdentityAttributesError, missingRequiredIdentityAttributesError, identityKeywordValueError);
                            if(Object.getOwnPropertyNames(error).length !== 0)
                            {
                                return cb(error, null, null);
                            }
                            else
                            {
                                return cb(null, identity, body);
                            }
                            
                        }
                    });
                });
            });
        }
        /*
        body == [{row1}, {row2}]
        body.forEach(function(row){
            AtrrRead.check(row, function(err) {
                
            })
        })
        
        */
        
        
        
        /*
        
        if(Object.getOwnPropertyNames(body).length !== 0)   // Cell with a value
        {
            AttributesReader.checkSupportedAttributes(Object.assign(identity, body), ['type', 'label', 'columnLabel', 'transformation', 'value'], function(unsupportedAttributesError) {
                AttributesReader.readRequiredAttributes(body, ['value'], function(missingRequiredBodyAttributesError) {
                    AttributesReader.readRequiredAttributes(identity, ['type', 'columnLabel'], function(missingRequiredIdentityAttributesError) {
                        AttributesReader.checkCellKeywordValue({type: identity.type, transformation: identity.transformation, value: body.value}, function(keywordValueError) {
                            var error = Object.assign(unsupportedAttributesError, missingRequiredBodyAttributesError, missingRequiredIdentityAttributesError, keywordValueError);
                            if(Object.getOwnPropertyNames(error).length !== 0)
                            {
                                return cb(error, null, null);
                            }
                            else
                            {
                                return cb(null, identity, body);
                            }
                        });
                    });
                });
            });
        }
        
        */
    };
    
    DSL.remoteMethod(
        'compileDocument',
        {
            description: "Compile a Document macro",
            isStatic: true,
            accepts : [
                { arg: 'identity', type: 'object', required: true, description: 'Document identity' },
                { arg: 'body', type: 'object', required: true, description: 'Document body' }
            ],
            returns: [
                { arg: 'error', type: 'Object' },
                { arg: 'identity', type: 'Object' },
                { arg: 'body', type: 'Object' }
            ]
        }
    );
    
    DSL.executeDocument = function(identity, body, conn, cb) {
        
    };
    
    DSL.remoteMethod(
        'executeDocument',
        {
            description: "Execute a Document macro",
            isStatic: true,
            accepts : [
                { arg: 'identity', type: 'object', required: true, description: 'Document identity' },
                { arg: 'body', type: 'object', required: true, description: 'Document body' }
            ],
            returns: [
                { arg: 'error', type: 'Object' },
                { arg: 'data', type: 'Object' }
            ]
        }
    );
};