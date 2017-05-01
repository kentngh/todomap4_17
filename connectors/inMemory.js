module.exports.isConfigured = function(params) {
	if (params != null) {
		if (params.type == 'memory') {
			return true;
		} else {
			return false;
		}
	}
	return true;
}

module.exports.connect = function(callback) {
	callback(null);
}

module.exports.getConnectionError = function() {
	return null;
}

var connectionInfo = {
	type:'Memory'
};

module.exports.getDb = function (callback) {
	callback(null,connectionInfo);
}

var toDos = [];
               
module.exports.getToDos = function (callback) {
	callback(null,toDos);
}

module.exports.addToDo = function (toDoObject,callback) {
	toDos.push(toDoObject);
	callback(null,toDoObject);
}

module.exports.removeToDo = function (title, callback) {
	for (var i = 0; i < toDos.length; i++) {
		if (toDos[i].title == title) {
			var results = toDos.splice(i,1);
			callback(null,results);
			return;
		}
	}
}

module.exports.tearDown = function(callback) {
	callback();
}