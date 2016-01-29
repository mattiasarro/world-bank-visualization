angular.module('app').directive("graph", function() {
    function link(scope, element, attr) {
		//Need this boolean to totally disable the frame after mouse up
		dragging = false;

        var width = 925;
        var height = 550;
        var margin = 30;
        var rightMargin = 150;
        
        var y, x, years, endYear, svgGraph, line, countryLine;
        
        svgGraph = d3.select(element[0]).append("svg")
                     .attr("width", width + rightMargin)
                     .attr("height", height);
        
        svgGraph.on("mousedown", startDragging)
                .on("mousemove", drag)
                .on("mouseup", stopDragging);
        
        scope.$watch('limits', function(countries) {
            var startYear = scope.limits.startYear;
                endYear = scope.limits.endYear;
            var startPercent = scope.limits.startPercent;
            var endPercent = scope.limits.endPercent;
            
            y = d3.scale.linear().domain([endPercent, startPercent]).range([0 + margin, height - margin]);
            x = d3.scale.linear().domain([startYear, endYear]).range([0 + margin - 5, width]);
            years = d3.range(startYear, endYear + 1);
            svgGraph.selectAll(".xLabel").remove();
            svgGraph.selectAll(".yLabel").remove();
            svgGraph.selectAll(".xTicks").remove();
            svgGraph.selectAll(".yTicks").remove();
            svgGraph.selectAll(".xAxis").remove();
            svgGraph.selectAll(".yAxis").remove();

            line = d3.svg.line().x(function(d) { return x(d.x) })
                                .y(function(d) { return y(d.y) });
            countryLine = d3.svg.line().x(function(d) { return x(d.year) })
                                       .y(function(d) { return y(d.perCent) });

            var xPoints = [[{x: startYear, y: startPercent}, {x: endYear, y: startPercent }]]; // not sure why array inside array necessary
            var yPoints = [[{x: startYear, y: startPercent}, {x: startYear, y: endPercent }]];
            svgGraph.append("svg:path").data(xPoints).attr("d", line).attr("class", "axis xAxis"); // x-axis
            svgGraph.append("svg:path").data(yPoints).attr("d", line).attr("class", "axis yAxis"); // y-axis

			//define the tick to avoid the floating point years
			var xTicks = years.length >= 5 ? 5 : years.length - 1;
            svgGraph.selectAll(".xLabel").data(x.ticks(xTicks))
                    .enter().append("svg:text")
                    .attr("class", "xLabel")
                    .text(String).attr("x", x)
                    .attr("y", height - 10).attr("text-anchor", "middle");
            svgGraph.selectAll(".yLabel").data(y.ticks(4))
                    .enter().append("svg:text")
                    .attr("class", "yLabel")
                    .text(String).attr("x", 0).attr("y", y)
                    .attr("text-anchor", "right").attr("dy", 3);
            svgGraph.selectAll(".xTicks").data(x.ticks(xTicks))
                    .enter().append("svg:line")
                    .attr("class", "xTicks")
                    .attr("x1", x)
                    .attr("y1", y(startPercent))
                    .attr("x2", x)
                    .attr("y2", y(startPercent) + 7);
            svgGraph.selectAll(".yTicks").data(y.ticks(4))
                    .enter().append("svg:line")
                    .attr("class", "yTicks")
                    .attr("y1", y)
                    .attr("x1", x(startYear - 0.1))
                    .attr("y2", y)
                    .attr("x2", x(startYear));
        });
        

        
        scope.$watch('mode', function(countries) {
            svgGraph.selectAll("path.country-line").remove();
        }, true);

        scope.$watch('countries', function(countries) {
            if (scope.mode != "countries") { return; }
			//these 2 functions need to be updated when the new ranges are set
			yReversed = d3.scale.linear().domain([0 + margin, height - margin]).range([scope.$parent.limits.endPercent, scope.$parent.limits.startPercent]);
			xReversed = d3.scale.linear().domain([0 + margin - 5, width]).range([0, scope.$parent.limits.endYear - scope.$parent.limits.startYear]);

            var data = [];
            angular.forEach(countries, function(country, countryCode) {
                data.push(country);
            });

            var countryLines = svgGraph.selectAll("path.country-line").data(data, function(d) {
                return (d.code);
            });
            // update()
            defineBehavior(countryLines);
            // enter()
            defineBehavior(countryLines.enter().append("svg:path"));
            countryLines.exit().remove();

            defineCountryNameBehavior(svgGraph.selectAll("text.countryName"));
            defineCountryNameBehavior(countryLines.enter().append("svg:text"));
            
            function defineCountryNameBehavior(selection) {
                selection
                    .attr("class", function(d) { return (d.active ? "countryName countryNameActive" : "countryName") })
                    .text(function(d) { return d.name })
                    .attr("x", function(d) { return x(endYear + 0.2) })
                    .attr("y", function(d) { 
                        if (Object.keys(d.dataPoints).length == 0) {
                            return 0;
                        } else {
                            return y(d.dataPoints["year" + scope.limits.endYear].perCent) 
                        }
                    })
                    .attr("text-anchor", "left").attr("dy", 3);
            }

            function defineBehavior(selection) { // since behavior is same for enter() and update(), pull it into a function
                selection.attr("class", function(d) { return (d.regionCode + " country-line") })
                    .classed("active", function(d) { return d.active })
                    .attr("country", function(d) { return (d.code) })
                    .attr("d", function(d) { 
                        var visiblePoints = [];
                        angular.forEach(d.dataPoints, function(p, yearStr) {
                            if (p.visible) {
                                visiblePoints.push(p);
                            }
                        })
                        return countryLine(visiblePoints) 
                    })
                    .style("visibility", function(d) { return (d.state) }) // if "highlighted", just interpreted as visible
                    .classed('highlighted', function(d) { return (d.state == "highlighted" ? true : false) })
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
                if (d.activePersistent) { return; }
                scope.$apply(function() {
                    scope.$parent.countries[d.code].active = true;
                });
            }

            function unsetActive(d) {
                if (d.activePersistent) { return; }
                scope.$apply(function() {
                    scope.$parent.countries[d.code].active = false;
                });
            }

        }, true);

        scope.$watch('year', function(year) {
            var selectedPoints = [[ {x: scope.$parent.year, y: scope.limits.startPercent} , 
                                    {x: scope.$parent.year, y: scope.limits.endPercent} ]];
            var sel = svgGraph.selectAll("path.year")
                              .data(selectedPoints, function(d){ return 1 })
                              .attr("d", line);
            
            sel.enter().append("svg:path")
               .attr("d", line)
               .attr("class", "axis year");
        });

        
        function startDragging() {
			dragging = true;
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
        }
        
        function drag() {
			if (!dragging) { return; }
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
        }
        
        function stopDragging() {
			dragging = false;
            var s = svgGraph.select("rect.selection");

            if (!s.empty()) {
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
                angular.forEach(scope.countries, function(country) {
                    var dataPoints = country.dataPoints;
                    // var newDataPoints = [];
                    angular.forEach(dataPoints, function(p, yearStr) {
                        yearLowerBound = years[Math.floor(xReversed(rect.x))];
                        yearUpperBound = years[Math.floor(xReversed(rect.x + rect.width))];
                        percentLowerBound = Math.floor(yReversed(rect.y + rect.height));
                        percentUpperBound = Math.floor(yReversed(rect.y));
                        xVal = p.year;
                        yVal = p.perCent;

                        if (!(xVal >= yearLowerBound && xVal <= yearUpperBound && yVal >= percentLowerBound && yVal <= percentUpperBound)) {
                            p.visible = false
                        }
                    });

                    countries[country.code] = country;
                    countries[country.code].dataPoints = dataPoints;
                });
                
                scope.$apply(function() {
                    scope.$parent.limits = {
                        startYear: yearLowerBound,
                        endYear: yearUpperBound,
                        startPercent: Math.floor(yReversed(rect.y + rect.height)),
                        endPercent: Math.floor(yReversed(rect.y))
                    }
                    scope.$parent.year = yearLowerBound;
                    scope.$parent.countries = [];
                    scope.$parent.countries = countries;
                });
            }
            svgGraph.selectAll("rect.selection").remove();
        }
    }
    return {
        link: link,
        restrict: 'A',
        scope: true
    }
});
