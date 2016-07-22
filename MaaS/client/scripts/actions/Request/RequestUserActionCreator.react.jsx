// Name: {RequestUserActionCreator.react.jsx}
// Module: {ActionsCreators}
// Location: {/MaaS/clientscripts/actions/Request/}

// History:
// Version         Date            Programmer
// ==========================================

var Dispatcher = require("../../dispatcher/Dispatcher.js");
var WebAPIUtils = require("../../utils/UserWebAPIUtils.js");
var Constants = require("../../constants/Constants.js");

var ActionTypes = Constants.ActionTypes;

var UserActionCreator = {
    resetPassword: function(email) {
        WebAPIUtils.resetPassword(email);
    },

    changePassword: function(id, password, confirmation, accessToken) {
        WebAPIUtils.changePassword(id, password, confirmation, accessToken);
    },

    changePersonalData: function(id, name, surname, dateOfBirth, gender) {
        WebAPIUtils.changePersonalData(id, name, surname, dateOfBirth, gender);
    },

    getUser: function(id) {
        WebAPIUtils.getUser(id);
    },

    getCompany: function(userId) {
        WebAPIUtils.getCompany(userId);
    },

    getEditorConfig: function(userId){
        //window.alert("request action web api util");
        WebAPIUtils.getEditorConfig(userId);
    }
};

module.exports = UserActionCreator;