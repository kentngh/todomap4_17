// public/core.js
var scotchTodo = angular.module('toDoApp', []);

function mainController($scope, $http) {

	var markersArray = [];
	google.maps.Map.prototype.clearOverlays = function()
	{
	  for (var i = 0; i < markersArray.length; i++ )
	  {
	    markersArray[i].setMap(null);
	  }
	  markersArray.length = 0;
	}

	function setDatacenters (data, datacenters, activeIP)
	{
	    var infowindow = new google.maps.InfoWindow();
	    var marker;

		map.clearOverlays();

		for (var eachIP in datacenters)
		{
			var location = data.datacenters[eachIP];

			// Show this one if it is in the current cluster, OR it is this IP.
			// (This allows hidden ones to show)
			//
			if ((activeIP != eachIP) &&
				(data.cluster == null || location.cluster != data.cluster))
			{
				continue;
			}

			var latLng = location.location;
			var image = null;
			var activeFlag = "";

			if (activeIP == eachIP)
			{
				lastLatLng = latLng;
				activeFlag = "<ACTIVE> ";
	            image = {
	                url: data.icon,
	                size: new google.maps.Size(136,136),
	                origin: new google.maps.Point(0,0),
	                anchor: new google.maps.Point(38,136)
	            };
			}
			else
			{
		        image = {
	                url: location.icon,
	                scaledSize: new google.maps.Size(68,68),
	                origin: new google.maps.Point(0,0),
	                anchor: new google.maps.Point(19,68)
	            };
			}
			marker = new google.maps.Marker({
				position: latLng,
				map: map
			});
            marker.setIcon(image);

			// So we can clear them later
			//
			markersArray.push(marker);

			google.maps.event.addListener(marker, 'click', (function(marker, eachIP)
				{
					return function()
					{
						var location = datacenters[eachIP];
						var name = activeFlag + location.cloud + " (" + location.region + ") [" + eachIP + "]";
						infowindow.setContent(name);
						infowindow.open(map, marker);
					}
				})(marker, eachIP));
		}
    }

    $scope.refreshToDo = function () {
        $http.get('/api/todos')
            .success(function(data) {
                setPageData(data);
            })
            .error(function(data, status, headers, config) {
                console.log('error on refresh',data,status,headers,config);
            });
    }

    $scope.createTodo = function() {
        if ($scope.formData.text) {
            $http.post('/api/todos', $scope.formData)
                .success(function(data) {
                    $scope.formData = {}; // clear the form so our user is ready to enter another
                    setPageData(data);
                })
                .error(function(data) {
                    console.log('Error: ' + data);
                    $scope.formData = {};
                });
        }
    };

    $scope.deleteTodo = function(id) {
        $http.delete('/api/todos/' + encodeURIComponent(id))
            .success(function(data) {
                setPageData(data);
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    function setPageData (data) {
		var activeIP = data.provider.ipAddress;

        $scope.todos = data.todos;

		$scope.cluster = ((data.cluster == null) ? "" : data.cluster);

		setDatacenters(data, data.datacenters, activeIP);

        lastLatLng = data.latLng;

        $scope.provider = data.provider;

		if (!$scope.currentInfo) {
          $scope.currentInfo = {};
        }

		if ($scope.dbInfo)
		{
	        $scope.currentInfo = data.currentDbInfo;
		}

        if (data.error) {
            $scope.error = data.error;
            console.log('error',$scope.error);
        } else {
            $scope.error = null;
            delete $scope.error;
        }
    }

    $scope.populateCurrent = function () {
      if (!$scope.db) {
        $scope.db = {};
      }
      if ($scope.dbInfo.type) {
          $scope.db.type = $scope.dbInfo.type.toLowerCase();
      }
      $scope.db.user = $scope.dbInfo.user;
      $scope.db.password = $scope.dbInfo.password;
      $scope.db.host = $scope.dbInfo.host;
      $scope.db.port = $scope.dbInfo.port;
      $scope.db.database = $scope.dbInfo.database;
    }

    $scope.connectDb = function() {
        $scope.lastDbApply = {};
        $http.put('/api/db', $scope.db)
            .success(function(data) {
                $scope.db = {}; // clear the form so our user is ready to enter another
                console.log(data);
                if (data != "null") {
                    $scope.lastDbApply.error = data;
                }
                $http.get('/api/db')
                    .success(function(data) {
                        $scope.dbInfo = data;
                        //$scope.refreshToDo();
			$scope.currentInfo.user = $scope.dbInfo.user;
			$scope.currentInfo.password = $scope.dbInfo.password;
                        console.log(data);
                    })
                    .error(function(data) {
                        console.log('Error: ' + data);
                    });
            })
            .error(function(data) {
                console.log('Error: ' + data);
                $scope.db = {};
            });
    }

    $scope.resetDb = function() {
        $scope.lastDbApply = {};
        $http.put('/api/db')
            .success(function(data) {
                $scope.db = {}; // clear the form so our user is ready to enter another
                console.log(data);
                if (data != "null") {
                    $scope.lastDbApply.error = data;
                }
                $http.get('/api/db')
                    .success(function(data) {
                        $scope.dbInfo = data;
                        //$scope.refreshToDo();
			$scope.currentInfo.user = $scope.dbInfo.user;
			$scope.currentInfo.password = $scope.dbInfo.password;

                        console.log(data);
                    })
                    .error(function(data) {
                        console.log('Error: ' + data);
                    });
            })
            .error(function(data) {
                console.log('Error: ' + data);
                $scope.db = {};
            });
    }

    $scope.killServer = function() {
        $http.delete('/api')
            .success(function(data) {
                $scope.refreshToDo();
            })
            .error(function(data, status, headers, config, statusText) {
                console.log('error on kill server');
                window.location.reload();
            });
    }

    var mapOptions = {
		center: new google.maps.LatLng(70, 220),
		zoom: 2
    };
    map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);

    $scope.refreshToDo();

    $scope.formData = {};

    $http.get('/api/db')
        .success(function(data) {
            $scope.dbInfo = data;
            //console.log(data);
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });
}
