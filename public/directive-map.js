angular.module('app').directive("map", function() {
    function link(scope, element, attr) {
        d3.json("vendor/world-topo.json", function(error, world) {
            var width, height, projection, path, graticule, svg, attributeArray = [], currentAttribute = 4, playing = false, countries;
            
            setMap();
            scope.$watch('countries', function(countries) {
                transferData(countries, world.objects.countries.geometries);
                drawMap(world); // let's mug the map now with our newly populated data object
            }, true);
            
            scope.$watch('year', function() {
                drawMap(world);
            }, true);
            
        });
        
        function setMap() {
            width = 900, height = 580; // map width and height, matches 
            projection = d3.geo.mercator() // define our projection with parameters
                .scale(170)
                .translate([width / 2, height / 2])
                .precision(.1);

            path = d3.geo.path() // create path generator function
                .projection(projection); // add our define projection to it

            svg = d3.select("#map").append("svg") // append a svg to our html div to hold our map
                .attr("width", width)
                .attr("height", height);

            svg.append("defs").append("path") // prepare some svg for outer container of svg elements
                .datum({
                    type: "Sphere"
                })
                .attr("id", "sphere")
                .attr("d", path);

            svg.append("use") // use that svg to style with css
                .attr("class", "stroke")
                .attr("xlink:href", "#sphere");
        }
        
        function transferData(countries, countriesGeo) {
            for (var i in countriesGeo) { // for each geometry object
                var id = countriesGeo[i].properties.id;
                for (var k in countries[id]) {
                    countriesGeo[i].properties[k] = countries[id][k];
                }
            }
        }

        function drawMap(world) {
            svg.selectAll(".country") // select country objects (which don't exist yet)
                .data(topojson.feature(world, world.objects.countries).features) // bind data to these non-existent objects
                .enter().append("path") // prepare data to be appended to paths
                .attr("class", "country") // give them a class for styling and access later
                .attr("id", function(d) {
                    return "code_" + d.properties.id;
                }, true) // give each a unique id for access later
                .attr("d", path); // create them using the svg path generator defined above

            d3.selectAll('.country') // select all the countries
                .attr('data-percent', getPercent)
                .style('stroke', getBorderColor)
                .style('fill', getColor);
        }
        
        function getPercent(d) {
            var dataPoints = d.properties.dataPoints;
            if (dataPoints != null) {
                var dataPoint = dataPoints["year" + scope.year];
                if (dataPoint != null) {
                    return(dataPoint.perCent);
                } else {
                    return(0)
                }
            } else {
                return(0);
            }
        }
        
        var highlights = {
            "SAS": "#895881",
            "ECS": "#ED7C31",
            "MEA": "#effa75",
            "SSF": "#6E9E75",
            "LCN": "#00BBD6",
            "EAS": "#e25f82",
            "NAC": "#be1932"
        };
        
        function getBorderColor(d) {
            if (d.properties.active) {
                return "#000000";
            } else if (d.properties.state == "highlighted") {
                return highlights[d.properties.regionCode];
            } else {
                return "#FFFFFF";
            }
        }
        
        function getColor(d) {
            if (d.properties.state == "hidden") {
                return("#ededed")
            } else {
                var quantize = d3.scale.quantize()
                .domain([0, 100])
                .range(["#c6d8ef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#085192", "#08306b"]);
                
                return quantize(getPercent(d)); // return that number to the caller
            }
        }
        
    }
    return {
        link: link,
        restrict: 'A',
        scope: true
    }
});