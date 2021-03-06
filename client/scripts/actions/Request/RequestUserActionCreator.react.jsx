var Dispatcher = require("../../dispatcher/Dispatcher.js");
var WebAPIUtils = require("../../utils/UserWebAPIUtils.js");
var Constants = require("../../constants/Constants.js");

var ActionTypes = Constants.ActionTypes;

var RequestUserActionCreator = {
    resetPassword: function(email) {
        WebAPIUtils.resetPassword(email);
    },

    changePassword: function(id, password, confirmation, accessToken) {
        WebAPIUtils.changePassword(id, password, confirmation, accessToken);
    },

    changePersonalData: function(id, name, surname, dateOfBirth, gender) {
        WebAPIUtils.changePersonalData(id, name, surname, dateOfBirth, gender);
    },
    
    changeAvatar: function(id, file) {
        WebAPIUtils.changeAvatar(id, file);
    },

    getUser: function(id) {
        WebAPIUtils.getUser(id);
    },
    
    deleteUser: function(email, id) {
        WebAPIUtils.deleteUser(email, id);
    },
    
    deleteAllSelectedUsers: function(arrayId) {
        WebAPIUtils.deleteAllSelectedUsers(arrayId);
    },

    getCompany: function(userId) {
        WebAPIUtils.getCompany(userId);
    },

    getEditorConfig: function(userId) {
        WebAPIUtils.getEditorConfig(userId);
    },
    
    changeEditorConfig: function(id, softTabs, theme, tabSize, fontSize) {
        WebAPIUtils.changeEditorConfig(id,softTabs,theme, tabSize, fontSize);
    },
    
    changeRole: function(email, role, id) {
        WebAPIUtils.changeRole(email, role, id);
    },
    
    getUsers: function(){
        WebAPIUtils.getUsers();
    },
    
    changeEmail: function(id, email, confirmationEmail){
        WebAPIUtils.changeEmail(id, email, confirmationEmail);
    },
    
    changeActiveDashboard: function(id, definitionId) {
        WebAPIUtils.changeActiveDashboard(id, definitionId);
    }
};

module.exports = RequestUserActionCreator;