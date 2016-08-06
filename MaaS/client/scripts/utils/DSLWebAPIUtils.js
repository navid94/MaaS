/*
* Name: {DSLWebAPIUtils.js}
* Module: {Front-end}
* Location: {/MaaS/client/scripts/utils/}
* 
* History:
* Version         Date            Programmer
* ===================================================
* 0.0.1        2016/08/02   Navid Taha, Fabiano Tavallini
* ---------------------------------------------------
* First structure of the file.
* ===================================================
*/

var ResponseDSLActionCreator = require('../actions/Response/ResponseDSLActionCreator.react.jsx');
var Constants = require('../constants/Constants.js');
var request = require('superagent');

function _getErrors(json) {
  var error, message;
    if(json.message) {
        message = json.message;
        // Other cases
        if(!error) {
            error = message;
        }
    }
    return error;
}

var APIEndpoints = Constants.APIEndpoints;

module.exports = {
    saveDSLDefinition: function(userId, type, name, source) {
      request
        .post(APIEndpoints.DSL + '/saveDefinition')
        .set('Accept', 'application/json')
        .set('Authorization', localStorage.getItem('accessToken'))
        .send({
          userId: userId,
          type: type,
          name: name,
          source: source
        })
        .end(function(err, res) {
          if(res)
          {
            res = JSON.parse(res.text);
            if(res.error)
            {
              ResponseDSLActionCreator.responseSaveDSLDefinition(null, res.error.message);
            }
            else
            {
              ResponseDSLActionCreator.responseSaveDSLDefinition(res.definition, null);
            }
          }
        });
    },
    
    overwriteDSLDefinition: function(id, type, source) {
      request
        .put(APIEndpoints.DSL + '/' + id + '/overwriteDefinition')
        .set('Accept', 'application/json')
        .set('Authorization', localStorage.getItem('accessToken'))
        .send({
          id: id,
          type: type,
          source: source
        })
        .end(function(err, res) {
          if(res)
          {
            res = JSON.parse(res.text);
            if(res.error)
            {
              alert('Errore:  '+ res.error.message);
              ResponseDSLActionCreator.responseOverwriteDSLDefinition(null, res.error.message);
            }
            else
            {
              alert(res.definition.name);
              ResponseDSLActionCreator.responseOverwriteDSLDefinition(res.definition, null);
            }
          }
        });
    },
    
    loadDSL: function(id) {
      request
        .get(APIEndpoints.DSL + '/' + id)
        .set('Accept', 'application/json')
        .set('Authorization', localStorage.getItem('accessToken'))
        .end(function(error, res) {
          if(res)
          {
            ResponseDSLActionCreator.responseLoadDSL(res.body);
          }
        });
    },
    
    loadDSLList: function(userId) {
      request
        .get(APIEndpoints.DSL_ACCESSES)
        .set('Accept', 'application/json')
        .set('Authorization', localStorage.getItem('accessToken'))
        .query({
              filter: { 
                    include:["dsl"], 
                    where: { "userId": userId }
              }
        })
        .end(function(error, res) {
          if(res)
          {
            console.log(res.body);
            ResponseDSLActionCreator.responseLoadDSLList(res.body);
          }
          else 
            alert("error");
        });
        
    },
    
    deleteDSLDefinition: function(id) {
      request
        .del(APIEndpoints.DSL + '/' + id + '/deleteDefinition')
        .set('Accept', 'application/json')
        .set('Authorization', localStorage.getItem('accessToken'))
        .end(function(error, res) {
          if (res)
          {
            res = JSON.parse(res.text);
            if(res.error) 
            {
              // res.error.message: errori di loopback e error definito dal remote method
              ResponseDSLActionCreator.responseDeleteDSLDefinition(res.error.message, null);
            } 
            else 
            {
              ResponseDSLActionCreator.responseDeleteDSLDefinition(null, id);
            }
          }
        });
    },
    
    changeDSLDefinitionPermissions(id, userId) {
      request
        .put(APIEndpoints.DSL + '/' + id + '/changeDefinitionPermissions')
        .set('Accept', 'application/json')
        .set('Authorization', localStorage.getItem('accessToken'))
        .end(function(error, res) {
          if(res)
          {
            alert("Ritorno web api");
          }
        });
    }
    
};