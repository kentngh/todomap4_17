var express  = require('express');
var app      = express();                             
var bodyParser = require('body-parser');    
var methodOverride = require('method-override'); 
var dotenv = require('dotenv');
var async = require('async');
var http = require('http');
var morgan = require('morgan')

morgan.token('cntm-instance', function getUUID (req) {
  return process.env['CNTM_INSTANCE_UUID']
})

morgan.token('real-client', function getRealClient (req) {
    // JRS-TMP console.log(req);    
    return req["headers"]["x-forwarded-for"];
})

morgan.token('cntm-job', function getJobFQN (req) {
  return process.env['CNTM_JOB_FQN']
})

morgan.token('zulu-date', function getZuluDate (req) {
	return new Date().toISOString();
})

// Trying to get the client IP rather than router
//
// morgan.format('apcera', 'access-log :remote-addr :remote-user :date[iso] latency :response-time ms :cntm-job :cntm-instance ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"')

morgan.format('apcera', 'access-log :real-client :remote-user :zulu-date latency :response-time ms :cntm-job :cntm-instance ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"')

app.use(morgan('apcera'))

var fs = require('fs');
if (fs.existsSync('.env')) {
    dotenv.load();
}

app.use(express.static(__dirname + '/static'));               
app.use(bodyParser.urlencoded({'extended':'true'}));            
app.use(bodyParser.json());                                     
app.use(bodyParser.json({ type: 'application/vnd.api+json' })); 
app.use(methodOverride());

var mongoConnector = require('./connectors//mongo');
var postgresConnector = require('./connectors/postgres');
var mysqlConnector = require('./connectors/mysql');
var inMemoryConnector = require('./connectors/inMemory');
var dbConnector = null;

var obj = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
var currentCluster = null;
var connectors = [mongoConnector,postgresConnector,mysqlConnector,inMemoryConnector];

// Find IP info
var ipinfo = "empty";
var opt = {
    host: 'ip-api.com',
    path: '/json'
};

var ip;
var ipAddress = null;

ipcallback = function (response){
    var str = '';
    response.on('data',function (chunk){
            str +=chunk;
    });

    response.on('end',function(){
            ip = JSON.parse(str);
            ipinfo = "";
            ipinfo += "Your IP: " + ip.query + "\n";
            ipinfo += "City : " + ip.city + "\n";
            ipinfo += "Country: " + ip.country + "\n";
            ipinfo += "ISP: " + ip.isp + "\n";
            ipinfo += "Latitude: " + ip.lat + "\n";
            ipinfo += "Longitude: " + ip.lon + "\n";
            ipinfo += "Time Zone: " + ip.timezone + "\n";
            ipinfo += "Zip: " + ip.zip + "\n";

        ipAddress = ip.query;
        determineLocationDetails();
    });
}

var locationDetails = null;

function determineLocationDetails () {
    
	// Find the location details.  Base-case way is via IP address
	// Alternatively, you might want to iterate and find slots 
	// (which might require updating the config.json)
	//
	locationDetails = obj[ipAddress];
	
    if (!locationDetails) {
        locationDetails = obj['default'];
    }
    locationDetails.appName = appName;
    locationDetails.namespace = namespace;
    locationDetails.appInstance = instanceId;
    locationDetails.ipAddress = ipAddress;
	
	if (currentCluster == null)
	{
		currentCluster = locationDetails.cluster
	}
}

var namespace = '-';
var appName = '-';
if (process.env['CNTM_JOB_FQN']) {
    var re = /job::(.*)::(.*)/
    namespace = process.env['CNTM_JOB_FQN'].replace(re,"$1");
    appName = process.env['CNTM_JOB_FQN'].replace(re,"$2");
}

var instanceId = '-';
var instanceLogStr = '[-]';

if (process.env['CNTM_INSTANCE_UUID']) {
    instanceId = process.env['CNTM_INSTANCE_UUID'].replace(/(........).*/,'$1') + '...';
    instanceLogStr = '[' + instanceId + ']';
}

http.request(opt,ipcallback).end();

async.eachSeries(connectors,
    function(connector,callback){
        if (dbConnector == null) {
            if (connector.isConfigured()) {
                connector.connect(function(error){
                    if (error) {
                        callback(error);
                    } else {
                        dbConnector = connector;
                        callback();
                    }
                });
            } else {
                callback();
            }
        } else {
            callback();
        }
    },
    function (error) {
        if (error) {
            console.log(error);
            dbConnector = inMemoryConnector;
        }
    });

app.delete('/api',function(req,res){
    process.exit(1);
});

app.get('/api/db',function(req,res){
    dbConnector.getDb(function(error,info){
        if (error) {
            res.send(error);
        } else {
            res.json(info);
        }        
    });
});

app.put('/api/db',function(req,res){
    dbConnector = null;
    async.eachSeries(connectors,function(connector,callback){
        connector.tearDown(function(error){
            callback();
        });
    },
    function (error) {
        async.eachSeries(connectors,
            function(connector,callback){
                if (dbConnector == null) {
                    var value = req.body;
                    if (!value.type) {
                        value = null;// this will cause connectors to look at environment instead
                    }
                    if (connector.isConfigured(value)) {
                        connector.connect(function(error){
                            if (error) {
                                callback(error);
                            } else {
                                dbConnector = connector;
                                callback();
                            }
                        });
                    } else {
                        callback();
                    }
                } else {
                    callback();
                }
            },
            function (error) {
                if (error) {
                    console.log(error);
                    
                    // TODO: reset to whatever it was before the attempt to change. Don't reset to InMemory.
                    resetDbToEnvSettings(function(newError){
                        if(newError) {
                            console.log(newError);
                        }
                        res.json(error);    
                    });
                    //dbConnector = inMemoryConnector;

                } else {
                    if (dbConnector == null) {
                        dbConnector = inMemoryConnector;
                    }
                    res.json(null);
                }
            });
    });
});

function resetDbToEnvSettings (finalCallback) {
    async.eachSeries(connectors,
        function(connector,callback){
            if (dbConnector == null) {
                if (connector.isConfigured(null)) { // this 'null' here is important
                    connector.connect(function(error){
                        if (error) {
                            callback(error);
                        } else {
                            dbConnector = connector;
                            callback();
                        }
                    });
                } else {
                    callback();
                }
            } else {
                callback();
            }
        },
        function (error) {
            finalCallback(error);
        });
}

function getTodosJson(res, todos){
        var instanceObj = locationDetails;
        res.header("Cache-Control", "no-cache, no-store, must-revalidate");
        res.json({todos:todos,
			latLng:instanceObj.location,
			icon:instanceObj.icon,
			provider:instanceObj,
			currentDbInfo:dbInfo,
			datacenters:obj,
			cluster: currentCluster});
	}

app.get('/api/dcs', function(req, res) {
    res.header("Cache-Control", "no-cache, no-store, must-revalidate");
    res.json({
		datacenters:obj,
		cluster: currentCluster});
});

app.get('/api/todos', function(req, res) {
	dbInfo = {};
    dbConnector.getDb(function(error,info){
        if (!error) {
            dbInfo = info;
			// console.log("DB INFO", info);
        }        
    });
		
    dbConnector.getToDos(function (error,todos){
        if (error) {
            res.send(error);
        } else {
			getTodosJson(res, todos);
       }
    });
});

app.get('/api/todos-orig', function(req, res) {
	dbInfo = {};
    dbConnector.getDb(function(error,info){
        if (!error) {
            dbInfo = info;
			// console.log("DB INFO", info);
        }        
    });
		
    dbConnector.getToDos(function (error,todos){
        if (error) {
            res.send(error);
        } else {
            var instanceObj = locationDetails;
            res.header("Cache-Control", "no-cache, no-store, must-revalidate");
            res.json({todos:todos,
				latLng:instanceObj.location,
				icon:instanceObj.icon,
				provider:instanceObj,
				currentDbInfo:dbInfo});
       }
    });
});

// create todo and send back all todos after creation
app.post('/api/todos', function(req, res) {
	dbInfo = {};
    dbConnector.getDb(function(error,info){
        if (!error) {
            dbInfo = info;
        }        
    });
	
    dbConnector.addToDo({title:req.body.text},function(error,todo){
        if (error) {
            res.send(error);
        } else {
            dbConnector.getToDos(function (error,todos){
                if (error) {
                    res.send(error);
                } else {
					getTodosJson(res, todos);                    
               }
            });
        }
    });
});

// delete a todo
app.delete('/api/todos/:id', function(req, res) {
	dbInfo = {};
    dbConnector.getDb(function(error,info){
        if (!error) {
            dbInfo = info;
        }        
    });	

    dbConnector.removeToDo(req.params.id,function(error,todo){
        if (error) {
            dbConnector.getToDos(function (error2,todos){
                if (error2) {
                    res.send(error2);
                } else {
                    var instanceObj = locationDetails;
                    res.json({todos:todos,latLng:instanceObj.location,icon:instanceObj.icon,provider:instanceObj,error:error});
                }
            });
        } else {
            dbConnector.getToDos(function (error,todos){
                if (error) {
                    res.send(error);
                } else {
					getTodosJson(res, todos);
                }
            });
        }
    });
});

var port = process.env.PORT || 5001;
var server = app.listen(port, function() {
    console.log(instanceLogStr,'listening on port ', port);
});
