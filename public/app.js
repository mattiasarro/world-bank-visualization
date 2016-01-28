app = angular.module('app', []);

app.controller('GraphController', function($scope, $http) {
    $scope.limits = {
        startYear: 1994,
        endYear: 2014,
        startPercent: 0,
        endPercent: 100
    }
    $scope.year = $scope.limits.startYear;
    
    $scope.regions = {
        "ECS": {name: "Europe and Central Asia", state: "visible"},
        "NAC": {name: "North America", state: "visible"},
        "LCN": {name: "Latin America & Caribbean", state: "visible"},
        "EAS": {name: "East Asia & Pacific", state: "visible"},
        "SAS": {name: "South Asia", state: "visible"},
        "MEA": {name: "Middle East & North Africa", state: "visible"},
        "SSF": {name: "Sub-Saharan Africa", state: "visible"},
    };

    $scope.countries = {};
    
    $http.get('country-regions.csv').success(function(text) {
        var countriesRegions = {};
        var rows = d3.csv.parseRows(text);
        for (i = 1; i < rows.length; i++) {
          countriesRegions[rows[i][0]] = rows[i][1];
        }

        $http.get('internet-usage-countries.csv').success(function(text) {
            var row = d3.csv.parseRows(text);
            for (i = 1; i < row.length; i++) {
                var values = row[i].slice(4, row[i.length - 1]);
                var countryCode = row[i][3];
                
                dataPoints = [];
                for (j = 0; j < values.length; j++) {
                    var perCent = values[j] == '..' ? (j == 0 ? 0 : dataPoints[j-1].perCent) : values[j];
                    dataPoints.push({
                        yearIndex: j,
                        perCent: perCent
                    });
                }
                
                var alpha2 = iso_3366_1_Alpha3_to_Alpha2[countryCode];
                
                if (alpha2 != undefined && dataPoints.length > 0) {
                    $scope.countries[countryCode] = {
                        code: countryCode,
                        codeAlpha2: alpha2,
                        name: row[i][2],
                        regionCode: countriesRegions[countryCode], // ECS | NAN, etc
                        active: false,
                        state: "visible", // highlighted | hidden
                        dataPoints: dataPoints
                    };
                }
            }
        });
    });

    $scope.togglePermaActive = function(country) {
        $scope.countries[country.code].active = !$scope.countries[country.code].active;
        $scope.countries[country.code].activePersistent = !$scope.countries[country.code].activePersistent;
    }
    
    $scope.toggleRegion = function(regionCode) {
        var mapping = {
            "hidden": "visible",
            "visible": "highlighted",
            "highlighted": "hidden"
        }
        var currentState = $scope.regions[regionCode]["state"];
        var newState = mapping[currentState];
        $scope.regions[regionCode]["state"] = newState;
        
        angular.forEach($scope.countries, function(country, countryCode) {
            if (country.regionCode == regionCode) {
                country.state = newState;   
            }
        });
    }
});

app.directive("graph", function() {
    function link(scope, element, attr) {
        var width = 925;
        var height = 550;
        var margin = 30;
        var rightMargin = 150;
        
        var y, x, years, endYear, vis, line, countryLine;
        
        svgGraph = d3.select(element[0]).append("svg")
            .attr("width", width + rightMargin).attr("height", height);
        
        scope.$watch('limits', function(countries) {
            var startYear = scope.limits.startYear;
                endYear = scope.limits.endYear;
            var startPercent = scope.limits.startPercent;
            var endPercent = scope.limits.endPercent;
            
            y = d3.scale.linear().domain([endPercent, startPercent]).range([0 + margin, height - margin]);
            x = d3.scale.linear().domain([startYear, endYear]).range([0 + margin - 5, width]);
            years = d3.range(startYear, endYear + 1);
            svgGraph.selectAll("*").remove();
            vis = svgGraph.append("svg:g");



            line = d3.svg.line().x(function(d) {
                    return x(d.x)
                })
                .y(function(d) {
                    return y(d.y)
                });
            countryLine = d3.svg.line().x(function(d) {
                    return x(years[d.yearIndex])
                })
                .y(function(d) {
                    return y(d.perCent)
                });

            var xPoints = [
                [{
                    x: startYear,
                    y: startPercent
                }, {
                    x: endYear,
                    y: startPercent
                }]
            ]; // not sure why array inside array necessary
            var yPoints = [
                [{
                    x: startYear,
                    y: startPercent
                }, {
                    x: startYear,
                    y: endPercent
                }]
            ];
            vis.append("svg:path").data(xPoints).attr("d", line).attr("class", "axis"); // x-axis
            vis.append("svg:path").data(yPoints).attr("d", line).attr("class", "axis"); // y-axis

            vis.selectAll(".xLabel").data(x.ticks(5))
                .enter().append("svg:text")
                .attr("class", "xLabel")
                .text(String).attr("x", x)
                .attr("y", height - 10).attr("text-anchor", "middle");
            vis.selectAll(".yLabel").data(y.ticks(4))
                .enter().append("svg:text")
                .attr("class", "yLabel")
                .text(String).attr("x", 0).attr("y", y)
                .attr("text-anchor", "right").attr("dy", 3);
            vis.selectAll(".xTicks").data(x.ticks(5))
                .enter().append("svg:line")
                .attr("class", "xTicks")
                .attr("x1", x)
                .attr("y1", y(startPercent))
                .attr("x2", x)
                .attr("y2", y(startPercent) + 7);
            vis.selectAll(".yTicks").data(y.ticks(4))
                .enter().append("svg:line")
                .attr("class", "yTicks")
                .attr("y1", y)
                .attr("x1", x(startYear - 0.1))
                .attr("y2", y)
                .attr("x2", x(startYear));

        });

        scope.$watch('countries', function(countries) {
            var data = [];
            angular.forEach(countries, function(country, countryCode) {
                data.push(country);
            });

            var yReversed = d3.scale.linear().domain([0 + margin, height - margin]).range([100, 0]);
            var xReversed = d3.scale.linear().domain([0 + margin - 5, width]).range([0, 20]);

            svgGraph.on("mousedown", function() {
                    var p = d3.mouse(this);

                    svgGraph.append("rect")
                        .attr({
                            rx: 6,
                            ry: 6,
                            class: "selection",
                            x: p[0],
                            y: p[1],
                            width: 0,
                            height: 0
                        })
                })
                .on("mousemove", function() {
                    var s = svgGraph.select("rect.selection");

                    if (!s.empty()) {
                        var p = d3.mouse(this),

                            d = {
                                x: parseInt(s.attr("x"), 10),
                                y: parseInt(s.attr("y"), 10),
                                width: parseInt(s.attr("width"), 10),
                                height: parseInt(s.attr("height"), 10)
                            },
                            move = {
                                x: p[0] - d.x,
                                y: p[1] - d.y
                            };

                        if (move.x < 1 || (move.x * 2 < d.width)) {
                            d.x = p[0];
                            d.width -= move.x;
                        } else {
                            d.width = move.x;
                        }

                        if (move.y < 1 || (move.y * 2 < d.height)) {
                            d.y = p[1];
                            d.height -= move.y;
                        } else {
                            d.height = move.y;
                        }

                        s.attr(d);
                    }
                })
                .on("mouseup", function() {
                    var s = svgGraph.select("rect.selection");

                    if (!s.empty()) {
                        scope.$apply(function() {
                            rect = {
                                x: parseInt(s.attr("x"), 10),
                                y: parseInt(s.attr("y"), 10),
                                width: parseInt(s.attr("width"), 10),
                                height: parseInt(s.attr("height"), 10)
                            };

                            if (rect.width < 20 || rect.height < 20) {
                                return;
                            }

                            countries = {};

                            data.forEach(function(d) {
                                var country = scope.$parent.countries[d.code];
                                //country.state = "hidden";
                                var dataPoints = d.dataPoints;
                                var newDataPoints = [];
                                dataPoints.forEach(function(p) {
                                    yearLowerBound = years[Math.floor(xReversed(rect.x))];
                                    yearUpperBound = years[Math.floor(xReversed(rect.x + rect.width))];
                                    percentLowerBound = Math.floor(yReversed(rect.y + rect.height));
                                    percentUpperBound = Math.floor(yReversed(rect.y));
                                    xVal = years[p.yearIndex];
                                    yVal = p.perCent;

                                    if (xVal >= yearLowerBound && xVal <= yearUpperBound && yVal >= percentLowerBound && yVal <= percentUpperBound) {
                                        //country.state = "visible";
                                        p.yearIndex = xVal - yearLowerBound;
                                        newDataPoints.push(p);
                                    }
                                });

                                countries[d.code] = country;
                                countries[d.code].dataPoints = newDataPoints;
                                //countries[d.code] = {
                                //	code: d.code,
                                //	codeAlpha2: country.codeAlpha2,
                                //	name: country.name,
                                //	regionCode: country.regionCode,
                                //	active: false,
                                //	state: "visible", // highlighted | hidden
                                //	dataPoints: newDataPoints
                                //};
                            });


                            scope.$parent.limits = {
                                startYear: yearLowerBound,
                                endYear: yearUpperBound,
                                //startYear: 1994,
                                //endYear: 2014,
                                //startPercent: 0,
                                //endPercent: 100
                                startPercent: Math.floor(yReversed(rect.y + rect.height)),
                                endPercent: Math.floor(yReversed(rect.y))
                            }

                            scope.$parent.countries = [];
                            scope.$parent.countries = countries;
                        });
                    }
                    svgGraph.selectAll("rect.selection").remove();
                });

            var countryLines = vis.selectAll("path.country-line").data(data, function(d) {
                return (d.code);
            });
            // update()
            defineBehavior(countryLines);
            // enter()
            defineBehavior(countryLines.enter().append("svg:path"));
            countryLines.exit().remove();

            defineCountryNameBehavior(vis.selectAll("text.countryName"));
            defineCountryNameBehavior(countryLines.enter().append("svg:text"));

            function defineCountryNameBehavior(selection) {
                selection
                    .attr("class", function(d) {
                        return (d.active ? "countryName countryNameActive" : "countryName")
                    })
                    .text(function(d) {
                        return d.name
                    })
                    .attr("x", function(d) {
                        return x(endYear + 0.2)
                    })
                    .attr("y", function(d) {
                        return y(d.dataPoints[d.dataPoints.length - 1].perCent)
                    })
                    .attr("text-anchor", "left").attr("dy", 3);
            }

            function defineBehavior(selection) { // since behavior is same for enter() and update(), pull it into a function
                selection.attr("class", function(d) {
                        return (d.regionCode + " country-line")
                    })
                    .classed("active", function(d) {
                        return d.active
                    })
                    .attr("country", function(d) {
                        return (d.code)
                    })
                    .attr("d", function(d) {
                        return countryLine(d.dataPoints)
                    })
                    .style("visibility", function(d) {
                        return (d.state)
                    }) // if "highlighted", just interpreted as visible
                    .classed('highlighted', function(d) {
                        return (d.state == "highlighted" ? true : false)
                    })
                    .on("click", togglePermaActive)
                    .on("mouseover", setActive)
                    .on("mouseout", unsetActive);
            }

            function togglePermaActive(d) {
                scope.$apply(function() {
                    scope.$parent.countries[d.code].active = false;
                    scope.$parent.togglePermaActive(d);
                });
            }

            function setActive(d) {
                if (d.activePersistent) {
                    return;
                }
                scope.$apply(function() {
                    scope.$parent.countries[d.code].active = true;
                });
            }

            function unsetActive(d) {
                if (d.activePersistent) {
                    return;
                }
                scope.$apply(function() {
                    scope.$parent.countries[d.code].active = false;
                });
            }

        }, true);

    }
    return {
        link: link,
        restrict: 'A',
        scope: true
    }
});

app.directive("map", function() {
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
            width = 960, height = 580; // map width and height, matches 
            projection = d3.geo.eckert5() // define our projection with parameters
                .scale(170)
                .translate([width / 2, height / 2])
                .precision(.1);

            path = d3.geo.path() // create path generator function
                .projection(projection); // add our define projection to it

            graticule = d3.geo.graticule(); // create a graticule

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

            svg.append("path") // use path generator to draw a graticule
                .datum(graticule)
                .attr("class", "graticule")
                .attr("d", path);
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
                .style('fill', getColor);
        }
        
        function getPercent(d) {
            var yearIndex = scope.year - scope.limits.startYear;
            if (d.properties.dataPoints != null) {
                    return(d.properties.dataPoints[yearIndex].perCent);
            } else {
                return(0);
            }
        }

        function getColor(d) {
            var quantize = d3.scale.quantize()
                .domain([0, 100])
                .range(["#c6d8ef", "#9ecae1", "#6baed6", "#4292c6", "#2171b5", "#085192", "#08306b"]);
        
            return quantize(getPercent(d)); // return that number to the caller
        }
        
    }
    return {
        link: link,
        restrict: 'A',
        scope: true
    }
});