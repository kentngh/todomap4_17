// public/core.js
var scotchTodo = angular.module('todoDatacenters', []);

function mainController($scope, $http) {

    $scope.refreshDatacenters = function () 
	{
        $http.get('/api/dcs')
            .success(function(data) {
                setDatacenters(data);
            });  
    }

	function setDatacenters (data)
	{
	    var infowindow = new google.maps.InfoWindow();
	    var marker;
		
		for (var eachIP in data.datacenters)
		{
			var location = data.datacenters[eachIP];
			if (data.cluster == null || location.cluster != data.cluster)
			{
				continue;
			}
			var latLng = location.location;
			
			marker = new google.maps.Marker({
				position: latLng,
				map: datacenterMap
			});

	        var image = {
                url: location.icon,
                scaledSize: new google.maps.Size(68,68),
                origin: new google.maps.Point(0,0),
                anchor: new google.maps.Point(19,68)
            };
            marker.setIcon(image);
						
			google.maps.event.addListener(marker, 'click', (function(marker, eachIP) 
				{
					return function() 
					{
						var location = data.datacenters[eachIP];
						var name = location.cloud + " (" + location.region + ") [" + eachIP + "]";
						infowindow.setContent(name);
						infowindow.open(datacenterMap, marker);
					}
				})(marker, eachIP));
		}
    }
	
	datacenterMap = new google.maps.Map(document.getElementById('datacenter-canvas'), {
	      zoom: 2,
	      center: new google.maps.LatLng(35, 0)
	    });
	var infowindow = new google.maps.InfoWindow();				

	
	$scope.refreshDatacenters();

	
}
