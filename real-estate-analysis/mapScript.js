
var markerControl = new Array();
var windowControl = null;

// Description: Initialize map - center, zoom, type
// Pre-Conditions: None
// Post-Conditions: map appears on a page
function initMap() {
  // Map Center
  var myLatLng = new google.maps.LatLng(42.354820, -71.066726);

  // General Options
  var mapOptions = {
    zoom: 12,
    center: myLatLng,
    mapTypeId: google.maps.MapTypeId.RoadMap
  };

  var map = new google.maps.Map(document.getElementById('map-canvas'), 
  mapOptions);
  addSearchBar(map);

  var marker_btn = document.createElement("button");
  marker_btn.innerHTML = "Draw";
  
  map.controls[ google.maps.ControlPosition.TOP_CENTER ].push(marker_btn);
  marker_btn.addEventListener('click', function() {
    drawArea(map); 
  });
}

// Description: Adds search bar
// with auto-fill and plotting properties
// Pre-Conditions: map should be non-null Google map
// Post-Conditions: spawns search bar
function addSearchBar(map) {
  // Create the search box and link it to the UI element.
  const input = document.getElementById("pac-input");
  const searchBox = new google.maps.places.SearchBox(input);

  map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

  // Bias the SearchBox results towards current map's viewport.
  map.addListener("bounds_changed", () => {
    searchBox.setBounds(map.getBounds());
  });
  let markers = [];

  // Listen for the event fired when the user selects a 
  // prediction and retrieve
  // more details for that place.
  searchBox.addListener("places_changed", () => {
    const places = searchBox.getPlaces();

    if (places.length == 0) {
      return;
    }

    // Clear out the old markers.
    markers.forEach((marker) => {
      marker.setMap(null);
    });

    const city_search = places[0]['address_components'];
    if (city_search.length == 4) {
      cleanMap();
      searchProperties(map, city_search[0]['long_name'], 
      city_search[2]['short_name']);
    }
    if (city_search.length == 5) {
      cleanMap();
      searchProperties(map, city_search[0]['long_name'], 
      city_search[3]['short_name']);
    }
  
    markers = [];

    // For each place, get the icon, name and location.
    const bounds = new google.maps.LatLngBounds();
    places.forEach((place) => {
      if (!place.geometry) {
        console.log("Returned place contains no geometry");
        return;
      }
      const icon = {
        url: place.icon,
        size: new google.maps.Size(71, 71),
        origin: new google.maps.Point(0, 0),
        anchor: new google.maps.Point(17, 34),
        scaledSize: new google.maps.Size(25, 25),
      };

      if (place.geometry.viewport) {
        // Only geocodes have viewport.
        bounds.union(place.geometry.viewport);
      } else {
        bounds.extend(place.geometry.location);
      }
    });

    map.fitBounds(bounds);
  });
}

// Description: Calls the Realtor API and plots
// all the properties that it received
// Pre-Conditions: map should be a non-null Google map
// Post-Conditions: drawing of a polyline will be enabled
// and the drawn polyline will be sent to the
// plotting function
function searchProperties(map, city, state) {
  const data = null;

  const xhr = new XMLHttpRequest();
  
  var myArr;
  xhr.addEventListener("readystatechange", function () {
	if (this.readyState === this.DONE) {
    myArr = JSON.parse(this.responseText);
    var properties = myArr['properties'];
    var p;
    var props = [];
    for (p = 0; p < properties.length; p++) {
       if (properties[p]['address']['line'] != null) {
        props.push(new Property(properties[p]['address']['line'], 
        properties[p]['address']['lat'], properties[p]['address']['lon'], 
        properties[p]['prop_type'], 1987, properties[p]['price'], 
        1200, 1800, 3000, properties[p]['price']/100, properties[p]['beds'], 
        properties[p]['baths']));
       }
    }
    plotMarkers(map, props);
	 }
  });
  
  xhr.open("GET", "https://realtor.p.rapidapi.com/properties/v2/list-for-sale?city=" + 
  city + "&limit=400&offset=0&state_code=" + state + "&sort=relevance");
  xhr.setRequestHeader("x-rapidapi-key", 
  "fa94a0d70emsh1c20f454b2b0cb6p1e09d8jsn5b459a5792dd");
  xhr.setRequestHeader("x-rapidapi-host", "realtor.p.rapidapi.com");

  xhr.send(data);
}


// Description: Wait for user to draw a region
// and send the polyline to the plotting function
// Pre-Conditions: map should be a non-null Google map
// Post-Conditions: drawing of a polyline will be enabled
// and the drawn polyline will be sent to the
// plotting function
function drawArea(map) {
    map.setOptions({draggable: false, zoomControl: false});
    var startDrawing = google.maps.event.addDomListener(map.getDiv(), 
    'dblclick', function(e) {
      //the polygon
      poly = new google.maps.Polyline({
        map: map,
        clickable: false
      });

      //move-listener
      var move = google.maps.event.addListener(map, 'mousemove', function(e) {
        poly.getPath().push(e.latLng);
      });

      //mouseup-listener
      google.maps.event.addListenerOnce(map, 'mouseup', function(e) {
        google.maps.event.removeListener(move);
        var path = poly.getPath();

        console.log(poly.getPath().getArray());
        plotArea(map, poly.getPath().getArray());
        poly.setMap(null);

        google.maps.event.removeListener(startDrawing);
        map.setOptions({draggable: true, zoomControl: true});
        return path;
      });
    });
}

// Description: Plot properties contained within drawn polyline
// Pre-Conditions: arguments should be non-null
// map should be Google Map, polyline should be an array of LatLng objects
// Post-Conditions: properties contained within the polyline will
// be plotted
function plotArea(map, polyline) {
  var geocoder = new google.maps.Geocoder();

  geocoder.geocode({ 'latLng' : polyline[5] }, (results, status) => {
    if (status === "OK") {
      if (results[1]) {
        const data = null;
        const xhr = new XMLHttpRequest();
        var myArr;

        xhr.addEventListener("readystatechange", function () {
	        if (this.readyState === this.DONE) {
            myArr = JSON.parse(this.responseText);
            var properties = myArr['properties'];
            var p;
            var props = [];
            const container = new google.maps.Polygon({ paths: polyline });

            for (p = 0; p < properties.length; p++) {
              var propertyLatLng = new google.maps.LatLng(properties[p]['address']['lat'], 
              properties[p]['address']['lon']);

              if (properties[p]['address']['line'] != null && 
              google.maps.geometry.poly.containsLocation(propertyLatLng, container)) {
                props.push(new Property(properties[p]['address']['line'], 
                properties[p]['address']['lat'], properties[p]['address']['lon'], 
                properties[p]['prop_type'], 1987, properties[p]['price'], 
                1200, 1800, 3000, properties[p]['price']/100, 
                properties[p]['beds'], properties[p]['baths']));
              }
            }

            cleanMap();
            plotMarkers(map, props);
          }
        });
        xhr.open("GET", "https://realtor.p.rapidapi.com/properties/v2/list-for-sale?city=" + 
        results[0]['address_components'][2]['long_name'] + "&limit=400&offset=0&state_code=" + 
        results[0]['address_components'][4]['short_name'] + "&sort=relevance");
        xhr.setRequestHeader("x-rapidapi-key", "fa94a0d70emsh1c20f454b2b0cb6p1e09d8jsn5b459a5792dd");
        xhr.setRequestHeader("x-rapidapi-host", "realtor.p.rapidapi.com");

        xhr.send(data);
      }
    } else {
      alert("Geocode was not successful for the following reason: " + status);
    }
  });
}


// Description: Makes an int readeable by separating surrounding blocks of three with commas
// Pre-Conditions: int should be passed as an argument
// Post-Conditions: returns comma separated int as a string
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}



// Description: Generates HTML content for a marker
// Pre-Conditions: address should be a string
// all other arguments should be integers
// Post-Conditions: returns formatted HTML content with provided information
function generateContent(address, fairMarketValue, profit, expenses, EI, bedrooms, bathrooms, prop_type) {
  const contentString = '<div id="content">' + "</div>" + 
  '<h3 id="firstHeading" class="firstHeading">' + address + '</h3>' +
  '<p><b>Property type:</b> ' + prop_type + '</p>' +
  '<p><b>Beds:</b> ' + bedrooms + "&emsp;" + '<b>Baths: </b>' +bathrooms+ '</p>'+
  '<div id= "bodyContent">' + "<p><b>Price:</b> $" + numberWithCommas(fairMarketValue) + '</p>' +
  '<p><b>Profit:</b> $' + numberWithCommas(profit) + ' per year</p>' +
  '<p><b>Expenses:</b> $' + numberWithCommas(expenses) + ' per year</p>' +
  '<p><b>Expense/Income Ratio:</b> ' + numberWithCommas(EI) + ' </p>'  + "</div>";
  return contentString;
}

// Description: Generates a marker for a given property
// Pre-Conditions: the argument should be of a type Property
// and should have non-null members, except for
// latitude and longitude
// Post-Conditions: Plots a marker containing given property on a map
function createMarker(propertyObject, map) {
  const infowindow = new google.maps.InfoWindow({
    content: generateContent(propertyObject.get_address(), 
    propertyObject.get_fairMarketValue(), propertyObject.get_netOperatingIncome(), 
    propertyObject.get_totalExpenses(), propertyObject.get_tax(),
    propertyObject.get_bedrooms(), propertyObject.get_bathrooms(),
    propertyObject.get_familySize())
  });
  var geocoder = new google.maps.Geocoder();
  var marker;
  setTimeout(geocoder.geocode({ address: propertyObject.get_address() }, 
  (results, status) => {
    if (status === "OK") {
      marker = new google.maps.Marker({
        position: results[0].geometry.location,
        title:propertyObject.get_address()
      });
      marker.addListener("click", () => {
        infowindow.open(map, marker);
      });
      marker.setMap(map);
    } else {
      alert("Geocode was not successful for the following reason: " + status);
    }
  }), 1000);
}


// Description: Plots marker without calling geocoder to get coordinates
// Pre-Conditions: the argument should be of a type Property and all
// its members should be non-null
// Post-Conditions: Plots a marker containing given property on a map
function createMarkerWithCoord(propertyObject, map) {
  const infowindow = new google.maps.InfoWindow({
    content: generateContent(propertyObject.get_address(), 
    propertyObject.get_fairMarketValue(), propertyObject.get_totalMonthlyProfitOrLoss(), 
    propertyObject.get_totalExpenses(), propertyObject.get_expenseToIncomeRatio(),
    propertyObject.get_bedrooms(), propertyObject.get_bathrooms(),
    propertyObject.get_familySize())
  });
  var icon = {
    url: "./marker.png",
    scaledSize: new google.maps.Size(50, 50), 
  };
  var marker = new google.maps.Marker({
    position: {
      lat: propertyObject.get_lat(), 
      lng: propertyObject.get_lng() },
    title:propertyObject.get_address(),
    icon : icon
  });
  markerControl.push(marker);
  marker.addListener("click", () => {
    closeLastOpenedInfoWindow();
    infowindow.open(map, marker);
    windowControl = infowindow;
  });
  marker.setMap(map);
}

// Description: Closes an info window
// Pre-Conditions: none
// Post-Conditions: A window contained in windowControl will be closed
function closeLastOpenedInfoWindow() {
  if (windowControl) {
      windowControl.close();
  }
}


// Description: Plot the markers for each property in a 
// given list on a given map
// Pre-Conditions: first argument should be a map object, 
// second argument should be a list of Property objects
// Post-Conditions: Updates map to include the markers 
// for provided properties
function plotMarkers(map, listOfProperties)
{
  for (property in listOfProperties)
  {
    createMarkerWithCoord(listOfProperties[property], map);
  }
}


// Description: Cleans up the markers from the map
// Pre-Conditions: none
// Post-Conditions: Markers contained in global marker array will be deleted
function cleanMap() {
  for ( i = 0;  i < markerControl.length; i++) {
    markerControl[i].setMap(null);
  }
  marketControl = new Array();
}