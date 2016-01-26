vis = angular.module('vis', []);

vis.controller('GraphController', function($scope, $http) {
        
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
        
        $scope.blurb = "";
        $scope.countries = {}; // {code: {code: "", name: "", region: "", dataPoints: []}}
        
        $http.get('country-regions.csv').success(function(text) {
            var countriesRegions = {};
            var regions = d3.csv.parseRows(text);
            for (i = 1; i < regions.length; i++) {
              countriesRegions[regions[i][0]] = regions[i][1];
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
                    
                    $scope.countries[countryCode] = {
                        code: countryCode,
                        name: row[i][2],
                        region: countriesRegions[countryCode],
                        current: false,
                        dataPoints: dataPoints
                    };
                }
            });
        });

        
        $scope.toggleRegion = function(id) {
            var countries = d3.selectAll("path." + id);
            switch($scope.regions[id]["state"]) {
                case "hidden":
                    countries.style("visibility", "visible");
                    $scope.regions[id]["state"] = "visible";
                break;
                
                case "visible":
                    countries.classed('highlight', true);
                    $scope.regions[id]["state"] = "highlighted";
                break;
                case "highlighted":
                    countries.classed('highlight', false);
                    countries.style("visibility", "hidden");
                    $scope.regions[id]["state"] = "hidden";
                break;
            }
        }
});

vis.directive("graph", function() {
    function link(scope, element, attr) {
        var width = 925;
        var height = 550;
        var margin = 30;
        
        var startYear = scope.$parent.limits.startYear;
        var endYear = scope.$parent.limits.endYear;
        var startPercent = scope.$parent.limits.startPercent;
        var endPercent = scope.$parent.limits.endPercent;
                
        var y = d3.scale.linear().domain([endPercent, startPercent]).range([0 + margin, height - margin]);
        var x = d3.scale.linear().domain([startYear, endYear]).range([0 + margin - 5, width]);
        var years = d3.range(startYear, endYear+1);
        var vis = d3.select(element[0]).append("svg:svg")
                                       .attr("width", width).attr("height", height)
                                       .append("svg:g");
        var line = d3.svg.line().x(function(d) { return x(d.x) })
                                .y(function(d) { return y(d.y) });
        var countryLine = d3.svg.line().x(function(d) { return x(years[d.yearIndex]) })
                                       .y(function(d) { return y(d.perCent) });
        
        var xPoints = [[ {x: startYear, y: startPercent} , {x: endYear, y: startPercent} ]]; // not sure why array inside array necessary
        var yPoints = [[ {x: startYear, y: startPercent} , {x: startYear, y: endPercent} ]];
        vis.append("svg:path").data(xPoints).attr("d", line).attr("class", "axis"); // x-axis
        vis.append("svg:path").data(yPoints).attr("d", line).attr("class", "axis"); // y-axis

        vis.selectAll(".xLabel").data(x.ticks(5))
                                .enter().append("svg:text")
                                .attr("class", "xLabel")
                                .text(String).attr("x", function(d) { return x(d) })
                                .attr("y", height - 10).attr("text-anchor", "middle");
        vis.selectAll(".yLabel").data(y.ticks(4))
                                .enter().append("svg:text")
                                .attr("class", "yLabel")
                                .text(String).attr("x", 0).attr("y", function(d) { return y(d) })
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

        scope.$watch('countries', function(countries) {
            var data = [];
            angular.forEach(countries, function(country, countryCode) {
                data.push(country);
            });
            
            var countryLines = vis.selectAll("path.country-line").data(data, function(d) { return d.code; });
            countryLines.enter().append("svg:path")
                                .classed("current", function(d) { return d.current })
                                .attr("class", function(d) { return(d.region) })
                                .attr("country", function(d) { return(d.code) })
                                .attr("d", function(d) { return countryLine(d.dataPoints) })
                                .on("mouseover", activate)
                                .on("mouseout", deactivate);
            countryLines.exit().remove();
        }, true);

        function activate(d, i) {
            // console.log(d);
            // d.current = true;
            // console.log(d);
            // d3.select(this).data(d);
            scope.$apply(function(){
                scope.blurb = d.name;
            });
        }

        function deactivate(d, i) {
            // d.current = false;
            // d3.select(this).data(d);
        //   d3.select(this).classed("current", false);
          scope.$apply(function(){
              scope.blurb = "";
          });
        }
        
    }
    return {
        link: link,
        restrict: 'A',
        scope: { countries: '=', blurb: '=' }
    }
});