var mongoose = require('mongoose'); 

var envConfigured = false;
var connectionError = null;
var Todo = null;

if (process.env.MONGO_URI) {
	envConfigured = true;
 
}

var connectionInfo = {
	type:'Mongo'
};

module.exports.isConfigured = function(params) {
	if (params != null) {
		if (params.type == 'mongo') {
			// capture all the other params
			return true;
		} else {
			return false;
		}
	}
	return envConfigured;
}

module.exports.connect = function(callback) {
	mongoose.connect(process.env.MONGO_URI,function(error){
		if (error) {
			callback(error);
		} else {
			connectionInfo.host = mongoose.connections[0].host;
			connectionInfo.port = mongoose.connections[0].port;
			connectionInfo.user = mongoose.connections[0].user;
			connectionInfo.password = mongoose.connections[0].password;
			connectionInfo.database = mongoose.connections[0].name;
			if (Todo == null) {
				Todo = mongoose.model('Todo', {
				    title : String
				});
			}
			callback(null);
		}
	}); 	
}

module.exports.getDb = function (callback) {
	callback(null,connectionInfo);
}
               
module.exports.getToDos = function (callback) {
	Todo.find(function(error, todos) {
		callback(error,todos);
	});
}

module.exports.addToDo = function (toDoObject,callback) {
	Todo.create(toDoObject, function(error, todo) {
		callback(error,todo);
	});
}

module.exports.removeToDo = function (title, callback) {
	Todo.remove({title :title}, function(error, todo) {
		callback(error,todo);
	});
}

module.exports.tearDown = function(callback) {
	if (mongoose.connection != null) {
		mongoose.connection.close();
	}
	callback();
}