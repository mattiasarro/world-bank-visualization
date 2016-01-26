app = angular.module('app', []);

app.controller('GraphController', function($scope, $http) {
        
        $scope.limits = {
            startYear: 1994,
            endYear: 2014,
            startPercent: 0,
            endPercent: 100
        }
        
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
                        if (values[j] != '' && values[j] != '..') {
                            dataPoints.push({
                                yearIndex: j,
                                perCent: values[j]
                            });
                        }
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

        $scope.toggleCountry = function(country) {
            $scope.countries[country.code].active = !$scope.countries[country.code].active;
            $scope.countries[country.code].activePersistent = !$scope.countries[country.code].activePersistent;
        }
        
        
        $scope.setCurrent = function (d) { 
            if (d.activePersistent) { return; }
            $scope.$apply(function(){ // needed since this func used by D3
                $scope.countries[d.code].active = true;
            });
        }
        
        $scope.unsetCurrent = function(d) {
            if (d.activePersistent) { return; }
            $scope.$apply(function(){ // needed since this func used by D3
                $scope.countries[d.code].active = false;
            });
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
        
        var y,x,years,endYear, vis,line,countryLine;
        
        scope.$watch('limits', function(countries) {
            var startYear = scope.limits.startYear;
                endYear = scope.limits.endYear;
            var startPercent = scope.limits.startPercent;
            var endPercent = scope.limits.endPercent;
                    
            y = d3.scale.linear().domain([endPercent, startPercent]).range([0 + margin, height - margin]);
            x = d3.scale.linear().domain([startYear, endYear]).range([0 + margin - 5, width]);
            years = d3.range(startYear, endYear+1);
            vis = d3.select(element[0]).append("svg:svg")
                                        .attr("width", width + rightMargin).attr("height", height)
                                        .append("svg:g");
            line = d3.svg.line().x(function(d) { return x(d.x) })
                                .y(function(d) { return y(d.y) });
            countryLine = d3.svg.line().x(function(d) { return x(years[d.yearIndex]) })
                                       .y(function(d) { return y(d.perCent) });
            
            var xPoints = [[ {x: startYear, y: startPercent} , {x: endYear, y: startPercent} ]]; // not sure why array inside array necessary
            var yPoints = [[ {x: startYear, y: startPercent} , {x: startYear, y: endPercent} ]];
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
            
            var countryLines = vis.selectAll("path.country-line").data(data, function(d) { return(d.code); });
            defineBehavior(countryLines); // update()
            defineBehavior(countryLines.enter().append("svg:path")); // enter()
            countryLines.exit().remove();
            
            defineCountryNameBehavior(vis.selectAll("text.countryName"));
            defineCountryNameBehavior(countryLines.enter().append("svg:text"));
            
            function defineCountryNameBehavior(selection) {
                selection
                    .attr("class", function(d) { return(d.active ? "countryName countryNameActive" : "countryName") })
                    .text(function(d) { return d.name })
                    .attr("x", function(d) { return x(endYear + 0.2) })
                    .attr("y", function(d) { return y(d.dataPoints[d.dataPoints.length-1].perCent) })
                    .attr("text-anchor", "left").attr("dy", 3);
            }
            
            function defineBehavior(selection) { // since behavior is same for enter() and update(), pull it into a function
                selection.attr("class", function(d) { return(d.regionCode + " country-line") })
                         .classed("active", function(d) { return d.active })
                         .attr("country", function(d) { return(d.code) })
                         .attr("d", function(d) { return countryLine(d.dataPoints) })
                         .style("visibility", function(d) { return(d.state) }) // if "highlighted", just interpreted as visible
                         .classed('highlighted', function(d) { return(d.state == "highlighted" ? true : false) })
                         .on("mouseover", scope.$parent.setCurrent)
                         .on("mouseout", scope.$parent.unsetCurrent);
            }
        }, true);
        
    }
    return {
        link: link,
        restrict: 'A',
        scope: { countries: '=', limits: '=', setCurrent: '=', unsetCurrent: '=' }
    }
});