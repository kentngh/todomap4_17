var mysql = require('mysql');
var connectionUrl = null;
var msConnection = null;
var connectionInfoObj = {
	type:'Mysql'
}

module.exports.isConfigured = function(params) {
	if (params != null) {
		if (params.type == 'mysql') {
			// capture all the other parameters
			connectionUrl = 'mysql://' + params.user + ':'+ params.password + '@' + params.host + ':' + params.port + '/' + params.database;
			console.log('manufactured url',connectionUrl);
			return true;
		} else {
			return false;
		}
	} else {
		if (process.env.MYSQL_URI) {
			connectionUrl = process.env.MYSQL_URI;
			console.log('connection url',connectionUrl);
			return true;
		} else {
			return false;
		}
	}
}

module.exports.connect = function(callback) {
	msConnection = mysql.createConnection(connectionUrl);
	connectionInfoObj.host = msConnection.config.host;
	connectionInfoObj.port = msConnection.config.port;
	connectionInfoObj.user = msConnection.config.user;
	connectionInfoObj.password = msConnection.config.password;
	connectionInfoObj.database = msConnection.config.database;
	msConnection.connect(function(error) {
    	if (error) {
      		callback(error);
    	} else {
			msConnection.query('CREATE TABLE tasks (title text);', function(err, result) {
				callback();
			});
    	}
  	});	
}

module.exports.getDb = function (callback) {
	callback(null,connectionInfoObj);
}
               
module.exports.getToDos = function (callback) {
	msConnection.query('SELECT title FROM tasks;', function(error, result) {
		if (error) {
			callback(error);
		} else {
			callback(null,result);
		}
	});
}

module.exports.addToDo = function (toDoObject,callback) {
	
	var command = 'INSERT into tasks (title) VALUES (?);'
	console.log(command, " ", toDoObject.title);
    msConnection.query(command,  toDoObject.title, function(error, result) {
      if (error) {
      	callback(error);
      } else {
      	callback(null,result);
      }
    });
}

module.exports.removeToDo = function (title, callback) {
	
	var command = "DELETE FROM tasks where title = ?";
	console.log(command, " ", title);
	msConnection.query(command, title, function(error, result) {
      if (error) {
        callback(error);
      } else {
      	callback(null,null);
      }
    });
}

module.exports.tearDown = function(callback) {
	msConnection = null;
	callback();
}