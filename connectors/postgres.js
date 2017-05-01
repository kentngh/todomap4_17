var pg = require('pg');
var connectionUrl = null;
var pgClient = null;
var connectionInfoObj = {
	type:'Postgres'
}

module.exports.isConfigured = function(params) {
	if (params != null) {
		if (params.type == 'postgres') {
			// capture all the other parameters
			connectionUrl = 'postgress://' + params.user + ':'+ params.password + '@' + params.host + ':' + params.port + '/' + params.database;
			console.log('manufactured url',connectionUrl);
			return true;
		} else {
			return false;
		}
	} else {
		if (process.env.POSTGRES_URI) {
			connectionUrl = process.env.POSTGRES_URI;
			console.log('given url',connectionUrl);
			return true;
		} else {
			return false;
		}
	}
}

module.exports.connect = function(callback) {
	pgClient = new pg.Client(connectionUrl);
	connectionInfoObj.host = pgClient.connectionParameters.host;
	connectionInfoObj.port = pgClient.connectionParameters.port;
	connectionInfoObj.user = pgClient.connectionParameters.user;
	connectionInfoObj.password = pgClient.connectionParameters.password;
	connectionInfoObj.database = pgClient.connectionParameters.database;
	pgClient.connect(function(error) {
    	if (error) {
      		callback(error);
    	} else {
			pgClient.query('CREATE TABLE tasks (title text);', function(err, result) {
				callback();
			});
    	}
  	});	
}

module.exports.getDb = function (callback) {
	callback(null,connectionInfoObj);
}
               
module.exports.getToDos = function (callback) {
	pgClient.query('SELECT title FROM tasks;', function(error, result) {
		if (error) {
			callback(error);
		} else {
			callback(null,result.rows);
		}
	});
}

module.exports.addToDo = function (toDoObject,callback) {
	var command = 'INSERT into tasks (title) VALUES ($1);'
	console.log(command + " " + toDoObject.title);
    pgClient.query({text: command, values: [toDoObject.title]}, function(error, result) {
      if (error) {
      	callback(error);
      } else {
      	callback(null,result);
      }
    });
}

module.exports.removeToDo = function (title, callback) {
	var command = "DELETE FROM tasks where title = $1;";
	console.log(command + " " + title);
	pgClient.query({text: command, values: [title]},function(error, result) {
      if (error) {
      	console.log(error);
        callback(error);
      } else {
      	console.log(result);
      	callback(null,null);
      }
    });
}

module.exports.tearDown = function(callback) {
	pgClient = null;
	callback();
}