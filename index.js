var map = L.map("map").setView([60.0746, 25.0097], 12);

L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png', {
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
    '<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>',
  maxZoom: 18,
  subdomains: 'abcd',
  id: 'hsl-map'}).addTo(map);

var realtime, client;

var tracked_vehicle;
var polyline;

var geohashes;
var geohash_polylines = L.layerGroup().addTo(map);

var screenIcon = L.icon({
    iconUrl: 'Blue-Digital.svg',
    iconSize: [40, 40]
});


  
  
	
var digi = [];
function getDistance(origin, destination) {
    // return distance in meters
    var lon1 = toRadian(origin[1]),
        lat1 = toRadian(origin[0]),
        lon2 = toRadian(destination[1]),
        lat2 = toRadian(destination[0]);

    var deltaLat = lat2 - lat1;
    var deltaLon = lon2 - lon1;

    var a = Math.pow(Math.sin(deltaLat/2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(deltaLon/2), 2);
    var c = 2 * Math.asin(Math.sqrt(a));
    var EARTH_RADIUS = 6371;
    return c * EARTH_RADIUS * 1000;
}
function toRadian(degree) {
    return degree*Math.PI/180;
}

const updateTopic = function() {
  if (client) {
    client.end(true);
  }
  if (realtime) {
    realtime.removeFrom(map);
  }

  validateFields();

  var topics = [];

  document.getElementById("topics").innerHTML = "";
							 //event_type/transport_mode/operator_id/vehicle_number/route_id/direction_id/headsign/
  var tram = "/hfp/v2/journey/+/+/tram/+/+/+/+/+/+/+/+/#";
  var metro = "/hfp/v2/journey/+/+/metro/+/+/+/+/+/+/+/+/#";
  topics.push(tram)
  topics.push(metro);
  document.getElementById("topics").innerHTML += tram;
  document.getElementById("topics").innerHTML += "\n";
  document.getElementById("topics").innerHTML += metro;
  document.getElementById("topics").innerHTML += "\n";
  /*if (geohashes) {
    geohashes.forEach(function(geohash) {
      var topic = topicBase;

      topic += "/";
      topic += document.getElementById("temporal_type").value;
      topic += "/";
      topic += "tram";
      topic += "/";
      topic += document.getElementById("operator_id").value;
      topic += "/";
      topic += document.getElementById("vehicle_number").value;
      topic += "/";
      topic += document.getElementById("route_id").value;
      topic += "/";
      topic += document.getElementById("direction_id").value;
      topic += "/";
      topic += document.getElementById("headsign").value;
      topic += "/";
      topic += document.getElementById("start_time").value;
      topic += "/";
      topic += document.getElementById("next_stop").value;
      topic += "/";
      topic += document.getElementById("geohash_level").value;
      topic += "/"
      topic += geohash;
      topic += "/#";

      topics.push(topic);
      document.getElementById("topics").innerHTML += topic;
      document.getElementById("topics").innerHTML += "\n";
    });
  } else {
    var topic = topicBase;

    topic += "/";
    topic += document.getElementById("temporal_type").value;
    topic += "/";
    topic += "+";
    topic += "/";
    topic += document.getElementById("operator_id").value;
    topic += "/";
    topic += document.getElementById("vehicle_number").value;
    topic += "/";
    topic += document.getElementById("route_id").value;
    topic += "/";
    topic += document.getElementById("direction_id").value;
    topic += "/";
    topic += document.getElementById("headsign").value;
    topic += "/";
    topic += document.getElementById("start_time").value;
    topic += "/";
    topic += document.getElementById("next_stop").value;
    topic += "/";
    topic += document.getElementById("geohash_level").value;
    topic += "/#";

    topics.push(topic);
    document.getElementById("topics").innerHTML += topic;
    document.getElementById("topics").innerHTML += "\n";
  }*/
  function highlightTableRow(rowId, highlight) {
  var row = document.getElementById(rowId);
  if (row) {
    if (highlight) {
      row.style.backgroundColor = "yellow";
    } else {
      row.style.backgroundColor = "";
    }
  }
}


  /* 
  MQTT 
  */
  var distanceVar = 300;
  var count = 0;
  var circlegroup = L.featureGroup();
  
  client = mqtt.connect("wss://mqtt.hsl.fi:443/");
  client.on("connect", function() {
    realtime = L.realtime(null, {
      start: false,
	  pointToLayer: function (feature, latlng) {
        return L.circleMarker(latlng,{radius: 2, color: feature.properties.desi.indexOf("M") > -1 ? 'red' : 'green'})
		
		}
      }).addTo(map);
    realtime.on("update", function(e) {
		
      var popupContent = function(fId) {
          var feature = e.features[fId];
          return '<b>' + feature.properties.name + '</b><br/>Nopeus: ' +
              feature.properties.speed+'km/h' + '<br/>' + 'Lähtöaika: ' + feature.properties.startTime
			  
      },
      bindFeaturePopup = function(fId) {
  realtime.getLayer(fId).on("popupopen", function() {
    tracked_vehicle = e.features[fId].properties.id;
    circlegroup = L.featureGroup();
    var circle = L.circle([e.features[fId].properties.data.lat, e.features[fId].properties.data["long"]], { radius: distanceVar }).addTo(circlegroup);
    map.addLayer(circlegroup);

    polyline = L.polyline([L.GeoJSON.coordsToLatLng(e.features[fId].geometry.coordinates)]).addTo(map);

    // Highlight the table row
    highlightTableRow(tracked_vehicle, true);

   
  });

  realtime.getLayer(fId).on("popupclose", function() {
    tracked_vehicle = null;
    polyline.removeFrom(map);
    map.removeLayer(circlegroup);

    // Remove highlight from the table row
    highlightTableRow(fId, false);
  });

  realtime.getLayer(fId).bindPopup(popupContent(fId));
},


      updateFeaturePopup = function(fId) {
          if (e.features[fId].properties.id === tracked_vehicle) {
              polyline.addLatLng(L.GeoJSON.coordsToLatLng(e.features[fId].geometry.coordinates));
			  map.removeLayer(circlegroup);
			  circlegroup = L.featureGroup();
			  var circle = L.circle([e.features[fId].properties.data.lat, e.features[fId].properties.data["long"]], { radius: distanceVar }).addTo(circlegroup);
			  map.addLayer(circlegroup);
			  console.log("--");
			  
          }
          realtime.getLayer(fId).getPopup().setContent(popupContent(fId));
      };

      Object.keys(e.enter).forEach(bindFeaturePopup);
      Object.keys(e.update).forEach(updateFeaturePopup);

	  
    });

    topics.forEach(function(topic) {
      client.subscribe(topic);
      console.log("Subscribed "+topic);
    });
  });
  client.on("message", function(topic, payload, packet) {
  var VP = JSON.parse(payload.toString()).VP;
  var topic = packet.topic.split("/");

  if (typeof VP !== "undefined") {
    if (VP.lat !== null) {
      var vehicleId = VP.oper + "-" + VP.veh;
      realtime.update({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [VP.long, VP.lat]
        },
        properties: {
          id: vehicleId,
          name: VP.desi + " - " + topic[10] + "(" + VP.veh + ")",
          speed: Math.round(3.6 * VP.spd),
          data: VP,
          startTime: VP.start,
          direction: VP.dir,
          desi: VP.desi
        }
      });

      // Update the table
      var tableBody = document.getElementById("vehicleTableBody");
      var row = document.getElementById(vehicleId);

      if (row) {
        row.cells[2].innerHTML = Math.round(3.6 * VP.spd);
      } else {
        var newRow = tableBody.insertRow(-1);
        newRow.id = vehicleId;

        newRow.insertCell(0).innerHTML = vehicleId;
        newRow.insertCell(1).innerHTML = VP.veh;
        newRow.insertCell(2).innerHTML = Math.round(3.6 * VP.spd);
        newRow.insertCell(3).innerHTML = VP.start;
        newRow.insertCell(4).innerHTML = VP.dir;
		
		var desiCell = newRow.insertCell(5);
		  desiCell.innerHTML = VP.desi;
		  if (VP.desi.includes("M")) {
			desiCell.style.backgroundColor = "red";
		  } else {
			desiCell.style.backgroundColor = "green";
		  }
		  
		// Add click event listener to open popup on the map
		newRow.addEventListener("click", function () {
		  var layer = realtime.getLayer(vehicleId);
		  if (layer) {
			// Center map to the circle with padding
			
			layer.openPopup();
		  }
		});

      }
    }
  }
});

};

var values = document.getElementsByClassName('value');
for (i = 0; i < values.length; i++) {
  var node = values.item(i);
  node.addEventListener("change", updateTopic);
}

/* document.getElementById("radius_value").addEventListener("change", function(event) {
    console.log(event.target.value);
	distanceVar = event.target.value;
	
});*/



document.getElementById('geohash_on').addEventListener('click', () => {
  var min = map.getBounds().getSouthWest();
  var max = map.getBounds().getNorthEast();

  var g = calculateGeohashesAndPolylines(min.lat, min.lng, max.lat, max.lng);

  geohashes = g[0];

  geohash_polylines.clearLayers();
  g[1].forEach(function(polyline) {
    polyline.addTo(geohash_polylines);
  });

  updateTopic();
});
document.getElementById('geohash_off').addEventListener('click', () => {
  geohashes = null;
  geohash_polylines.clearLayers();

  updateTopic();
});

updateTopic();

function validateFields() {
  setValidationNoteVisibility(document.getElementById("operator_id"), !/^(\+|[0-9]{4})$/.test(document.getElementById("operator_id").value));

  setValidationNoteVisibility(document.getElementById("vehicle_number"), !/^(\+|[0-9]{5})$/.test(document.getElementById("vehicle_number").value));

  setValidationNoteVisibility(document.getElementById("route_id"), !/^(\+|[1-9][0-9][0-9M][0-9][A-Z ]?[A-Z]?)$/.test(document.getElementById("route_id").value));

  setValidationNoteVisibility(document.getElementById("start_time"), !/^(\+|(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9])$/.test(document.getElementById("start_time").value));

  setValidationNoteVisibility(document.getElementById("next_stop"), !/^(\+|EOL|[0-9]{7})$/.test(document.getElementById("next_stop").value));
}

function setValidationNoteVisibility(element, visible) {
  element.parentNode.parentNode.childNodes.forEach(node => {
    if (node.className === 'validation_note') {
      if (visible) {
        node.style.visibility = 'visible';
      } else {
        node.style.visibility = 'hidden';
      }
    }
  })
}

function showTopics() {
  if(document.getElementById('topics').style.display == 'none') {
    document.getElementById('topics').style.display = 'block';
    document.getElementById('show_topics').innerHTML = 'Hide topics';
  } else {
    document.getElementById('topics').style.display = 'none';
    document.getElementById('show_topics').innerHTML = 'Show topics';
  }
}
var turfLayer = L.geoJson(null, {
style: function (feature) {
  var style = {
	color: '#561196',
	fillColor: '#561196',
	weight: 0.5
  };
  return style;
}
});
var lisaaPinnat = function(radius) {
	map.eachLayer(function (layer) {
		if (typeof layer._url === "undefined") {
			map.removeLayer(layer);
		}
	});
	
	turfLayer.addTo(map);
	
	var latLons = [];
	digitLat = {};
	d3.csv("digitesti.csv", function(d) {
		//var metrot = [];
		//var metrot = [];
		var valinetyypit = {};
		_.each(d, function(e) {
			e.Lat = e.Y; e.Lon = e.X;
			//if (typeof digitLat[e.Välinetyyppi] === "undefined") {
				//var marker = L.marker([e.Lat, e.Lon]).addTo(map);
				L.circleMarker([e.Lat, e.Lon], {radius: 4, weight: 0.5, color: "#aa30ee", options: e}).addTo(map);
				//digitLat[e.Välinetyyppi] = e.Välinetyyppi;
				if (typeof valinetyypit[e.Välinetyyppi] !== "undefined") {
					valinetyypit[e.Välinetyyppi].push(L.latLng(Number(e.Lat), Number(e.Lon)));
				}
				else {
					valinetyypit[e.Välinetyyppi] = [L.latLng(Number(e.Lat), Number(e.Lon))]
				}
			//}
		})
		
		console.log(valinetyypit);
		
		
		// Get rid of current layers in turfLayer
		turfLayer.clearLayers();
		
		_.each(valinetyypit, function (e) {
			//var clickedPoints = L.layerGroup().addTo(map)
			let a = []
			_.each(e, function(c) {
				a.push(c);
			});
			
			
			// If there are at least three points that have been clicked,
			// add the convex hull of those points to turfLayer
			//console.log(a);
			//if (a.length >= 3) {
			//  turfLayer.addData(turf.convex(a));
			//}
		});
	});
}
//lisaaPinnat();

var legend = L.control({position: 'topright'});

legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend');
	div.innerHTML +=
		"<i style='background:#aa30ee'></i> Digi" + "<br>" +
		"<i style='background:red'></i> Metro" + "<br>" +
		"<i style='background:green'></i> Ratikka" + "<br>";
		


    return div;
};

//legend.addTo(map)

/*function calculateGeohash(latlng) {
  var lat = latlng.lat;
  var lng = latlng.lng;

  var geohash ="/"+Math.floor(lat)+";"+Math.floor(lng);
  geohash += "/";
  geohash += lat.toString()[3]+lng.toString()[3];
  
  return geohash;
}*/

function sortTable(columnIndex, type) {
  var table, rows, switching, i, x, y, shouldSwitch, direction, switchcount = 0;
  table = document.getElementById("vehicleTable");
  switching = true;
  direction = "asc";

  while (switching) {
    switching = false;
    rows = table.rows;
    for (i = 1; i < rows.length - 1; i++) {
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[columnIndex];
      y = rows[i + 1].getElementsByTagName("TD")[columnIndex];

      if (direction === "asc") {
        if (type === 'number') {
          if (parseFloat(x.innerHTML) > parseFloat(y.innerHTML)) {
            shouldSwitch = true;
            break;
          }
        } else {
          if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
            shouldSwitch = true;
            break;
          }
        }
      } else if (direction === "desc") {
        if (type === 'number') {
          if (parseFloat(x.innerHTML) < parseFloat(y.innerHTML)) {
            shouldSwitch = true;
            break;
          }
        } else {
          if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
            shouldSwitch = true;
            break;
          }
        }
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      switchcount++;
    } else {
      if (switchcount === 0 && direction === "asc") {
        direction = "desc";
        switching = true;
      }
    }
  }
}


function calculateGeohashesAndPolylines(minLat, minLng, maxLat, maxLng) {
	var deltaLat = maxLat - minLat;
	var deltaLng = maxLng - minLng;

	var geohashLevel = Math.max(Math.ceil(Math.abs(Math.log10(deltaLat))), Math.ceil(Math.abs(Math.log10(deltaLng))));
	var delta = Math.pow(10, -geohashLevel);
  console.log(delta);

	var geohashes = [];
  var polylines = [];
	
	var lat = truncate(minLat, geohashLevel);

	while(lat <= maxLat) {
		var lng = truncate(minLng, geohashLevel);
		while(lng <= maxLng) {
			geohashes.push(calculateGeohash(lat, lng, geohashLevel));
      polylines.push(calculateGeohashPolyline(lat, lng, geohashLevel));

			lng += delta;
		}
		lat += delta;
	}

	return [geohashes, polylines];
}

function calculateGeohash(lat, lng, level) {
	var geohash = Math.floor(lat)+";"+Math.floor(lng); 
	
	for(var i = 0; i < level; i++) {
		geohash += "/";
		geohash += lat.toFixed(level + 1).split(".")[1][i];
		geohash += lng.toFixed(level + 1).split(".")[1][i];
	}

	return geohash;
}

function calculateGeohashPolyline(lat, lng, level) {
  var fixed_lat = parseFloat(lat.toFixed(level + 1).substr(0, level === 0 ? 2 : 3+level));
  var fixed_lng = parseFloat(lng.toFixed(level + 1).substr(0, level === 0 ? 2 : 3+level));

  var latlngs = [[fixed_lat, fixed_lng], [fixed_lat+Math.pow(10, 0 - level), fixed_lng], [fixed_lat+Math.pow(10, 0 - level), fixed_lng+Math.pow(10, 0 - level)], [fixed_lat, fixed_lng+Math.pow(10, 0 - level)], [fixed_lat, fixed_lng]];

  return L.polyline(latlngs, {color: "red", opacity: 0.1}).addTo(map);
}

function truncate(x, n) {
    if (n == 0) {
      return x;
    }

    var split = x.toFixed(n+1).split(".");

    return parseFloat(split[0]+"."+split[1].substring(0, n));
}