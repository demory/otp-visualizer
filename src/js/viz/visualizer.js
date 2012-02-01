/* This program is free software: you can redistribute it and/or
   modify it under the terms of the GNU Lesser General Public License
   as published by the Free Software Foundation, either version 3 of
   the License, or (at your option) any later version.
   
   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.
   
   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <http://www.gnu.org/licenses/>. 
*/

var hostname = "http://localhost:8080"; // do not include trailing '/'

var startLatLng = new L.LatLng(45.52, -122.681944); // Portland OR

var map;

var vertexLayer = null, edgeLayer = null;


/* INITIALIZATION */

$(document).ready(function() {

    map = new L.Map('map');

    var cloudmadeUrl = 'http://{s}.tile.cloudmade.com/882f51841e1f47e9b81b3e258e6d76b4/997/256/{z}/{x}/{y}.png',
        cloudmadeAttrib = 'Map data &copy; 2011 OpenStreetMap contributors, Imagery &copy; 2011 CloudMade',
        cloudmade = new L.TileLayer(cloudmadeUrl, {maxZoom: 18, attribution: cloudmadeAttrib});
        
    map.setView(startLatLng, 18).addLayer(cloudmade);
        
    map.on('zoomend', updateCount);
    map.on('moveend', updateCount);
    
    updateCount();
    
    $("#comps").click(showComponents);
    $("#vertices").click(refreshVertices);
    $("#edges").click(refreshEdges);
       
});


/* COMPONENTS FUNCTIONS */ 

function showComponents(event) {

    var url = hostname + '/opentripplanner-api-webapp/ws/components/polygons';
        
    $.ajax(url, {
        dataType: 'jsonp',
        success: function(data) {
            drawComponents(data.components);
        }
    });
}

function drawComponents(comps) {

    var geojson = new L.GeoJSON();
    
    for (var i = 0; i < comps.length; i++) {
        var obj = comps[i];
        for(x in obj) {
            console.log(" - "+obj[x]);
            geojson.addGeoJSON(obj[x]);
        }  
    }
        
    map.addLayer(geojson);        
}
    
/* VERTEX/EDGE COUNTER */

function updateCount(event) {
    var sw = map.getBounds().getSouthWest();
    var ll = sw.lat+','+sw.lng;

    var ne = map.getBounds().getNorthEast();
    var ur = ne.lat+','+ne.lng;

    var url = hostname + '/opentripplanner-api-webapp/ws/internals/countFeatures';
            
    $.ajax(url, {
        data: { 
            lowerLeft: ll,
            upperRight: ur               
        },
        dataType: 'jsonp',

            
        success: function(data) {
            $("#count_display").html('v='+data.vertices+", e="+data.edges);
        }
    });
}

/* VERTEX FUNCTIONS */

var collapsedVertices;

function refreshVertices(event) {
    
    var sw = map.getBounds().getSouthWest();
    var ll = sw.lat+','+sw.lng;

    var ne = map.getBounds().getNorthEast();
    var ur = ne.lat+','+ne.lng;
  
    var url = hostname + '/opentripplanner-api-webapp/ws/internals/vertices';
        
    $.ajax(url, {
        data: { 
            lowerLeft: ll,
            upperRight: ur               
        },
        dataType: 'jsonp',
        
        success: drawVertices
    });
}

function drawVertices(data) {
    var total = 0;
    collapsedVertices = new Object();
    for (var i = 0; i < data.vertices.length; i++) {
        var v = data.vertices[i];

        var key = v.x+"#"+v.y;
        total++;
        if(!collapsedVertices.hasOwnProperty(key))
            collapsedVertices[key] = new Array(v);
        else 
            collapsedVertices[key].push(v);
            
    }
    console.log("total="+total+", collapsedVertices="+Object.keys(collapsedVertices).length)

    if(vertexLayer != null) map.removeLayer(vertexLayer);
    
    vertexLayer = new L.LayerGroup();
    for(var key in collapsedVertices) {
        var coords = key.split('#');
        var marker = new L.CircleMarker(new L.LatLng(parseFloat(coords[1]), parseFloat(coords[0])), { radius: 5 } );
        var vertexArr = collapsedVertices[key];
        var popupText = "";
        if(vertexArr.length > 8) popupText += "<div style='height:120px; overflow: auto;'>";
        popupText += "<b>"+vertexArr.length+" vertices here:</b>";
        for(var i = 0; i < vertexArr.length; i++) {
            popupText += "<br><a href='javascript:showVertexInfo(\""+key+"\","+i+")'>"+vertexArr[i].label+"</a>";
        }
        if(vertexArr.length > 8) popupText += "</div>";
        marker.bindPopup(popupText);
        vertexLayer.addLayer(marker);
    }
    map.addLayer(vertexLayer);
}
        
    
function showVertexInfo(key, index) {
    var contents = "", title="";
    var v = collapsedVertices[key][index];
    for(var prop in v) {
        contents += prop+": "+v[prop]+"<br>";                    
        if(prop == "label") title = v[prop]; 
    }
    $("<div style='font-size: 12px;' title='"+title+"'>"+contents+"</div>").dialog()
}

/* EDGE FUNCTIONS */

function refreshEdges(event) {
    
    console.log("edges");
    
    var sw = map.getBounds().getSouthWest();
    var ll = sw.lat+','+sw.lng;

    var ne = map.getBounds().getNorthEast();
    var ur = ne.lat+','+ne.lng;
  
    var url = hostname + '/opentripplanner-api-webapp/ws/internals/edges';
        
    $.ajax(url, {
        data: { 
            lowerLeft: ll,
            upperRight: ur               
        },
        dataType: 'jsonp',        
        success: drawEdges
    });
}

function drawEdges(data) {
    var count = 0;
    
    if(edgeLayer != null) map.removeLayer(edgeLayer);
    
    edgeLayer = new L.LayerGroup();
    
    for (var i = 0; i < data.edges.length; i++) {
        var e = data.edges[i];
        var coords = new Array();
        if(e.edge.geometry != null) {
            count++;
            console.log(e);
            var geom = e.edge.geometry;
            for(var ci = 0; ci < geom.coordinates.length; ci++) {
                coords.push(new L.LatLng(geom.coordinates[ci][1], geom.coordinates[ci][0]));
            }
            
            var polyline = new L.Polyline(coords);                  
            edgeLayer.addLayer(polyline);
        }
        
    }
    map.addLayer(edgeLayer);
    console.log("edges w/ geom = "+count);
}


