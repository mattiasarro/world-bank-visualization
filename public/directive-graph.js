angular.module('app').directive("graph", ['helpers', function(helpers) {
    function link(scope, element, attr) {
    
        
        var width = 925;
        var height = 550;
        var margin = 30;
        var rightMargin = 150;
        
        var y, x, years, endYear, svgGraph, line, percentLine, indexLine, xReversed, yReversed;
        var dragging = false; // disable the frame after mouse up
        
        svgGraph = d3.select(element[0]).append("svg")
                     .attr("width", width + rightMargin)
                     .attr("height", height);
        
        svgGraph.on("mousedown", startDragging)
                .on("mousemove", drag)
                .on("mouseup", stopDragging);
        
        scope.$watch('limits', function(countries) {
            var startYear = scope.limits.startYear;
                endYear = scope.limits.endYear;
            var min = scope.limits.min;
            var max = scope.limits.max;
            
            yReversed = d3.scale.linear().domain([0 + margin, height - margin]).range([max, min]);
            xReversed = d3.scale.linear().domain([0 + margin - 5, width]).range([0, endYear - startYear]);
            y = d3.scale.linear().domain([max, min]).range([0 + margin, height - margin]);
            x = d3.scale.linear().domain([startYear, endYear]).range([0 + margin - 5, width]);
            years = d3.range(startYear, endYear + 1);

            line = d3.svg.line().x(function(d) { return x(d.x) })
                                .y(function(d) { return y(d.y) });
            percentLine = d3.svg.line().x(function(d) { return x(d.year) })
                                       .y(function(d) { return y(d.percent) });
            indexLine = d3.svg.line().x(function(d) { return x(d.year) })
                                     .y(function(d) { return y(d.percentGrowth) });

            var xPoints = [[{x: startYear, y: min}, {x: endYear, y: min }]]; // not sure why array inside array necessary
            var yPoints = [[{x: startYear, y: min}, {x: startYear, y: max }]];
            svgGraph.append("svg:path").data(xPoints).attr("d", line).attr("class", "axis xAxis"); // x-axis
            svgGraph.append("svg:path").data(yPoints).attr("d", line).attr("class", "axis yAxis"); // y-axis

            svgGraph.selectAll(".xLabel").remove();
            svgGraph.selectAll(".yLabel").remove();
            svgGraph.selectAll(".xTicks").remove();
            svgGraph.selectAll(".yTicks").remove();
            svgGraph.selectAll(".xAxis").remove();
            svgGraph.selectAll(".yAxis").remove();
            
            var xTicks = years.length >= 5 ? 5 : years.length - 1; // avoid the floating point years
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
                    .attr("y1", y(min))
                    .attr("x2", x)
                    .attr("y2", y(min) + 7);
            svgGraph.selectAll(".yTicks").data(y.ticks(4))
                    .enter().append("svg:line")
                    .attr("class", "yTicks")
                    .attr("y1", y)
                    .attr("x1", x(startYear - 0.1))
                    .attr("y2", y)
                    .attr("x2", x(startYear));
        });

        scope.$watch('mode', function(mode) {
            modeSwitch(mode);
        }, true);
        
        scope.$watch('countries', function(countries) {
            modeSwitch(scope.mode);
        }, true);

        scope.$watch('year', function(year) {
            var selectedPoints = [[ {x: scope.$parent.year, y: scope.limits.min} , 
                                    {x: scope.$parent.year, y: scope.limits.max} ]];
            var sel = svgGraph.selectAll("path.year")
                              .data(selectedPoints, function(d){ return 1 })
                              .attr("d", line);
            
            sel.enter().append("svg:path")
               .attr("d", line)
               .attr("class", "axis year");
        });
        
        function modeSwitch(mode) {
            svgGraph.selectAll("path.graph-line").remove();

            if (mode.dataSource == "countries") {
                var callbacks = {
                    classFunction: function(d) { 
                        return (d.regionCode + " graph-line country-" + d.code) 
                    },
                    click: scope.togglePermaActive,
                    mouseover: scope.activateCountry,
                    mouseout: scope.deactivateCountry
                }
                switch (mode.graphType) {
                    case "percent":
                        drawLines(scope.countries, percentLine, callbacks);
                        break;
                    case "index":
                        drawLines(scope.countries, indexLine, callbacks);
                        break;
                }
            } else if (mode.dataSource == "regions") {
                var callbacks = {
                    classFunction: function(d) { 
                        return ("graph-line region-line region-" + d.code) 
                    },
                    // click: scope.togglePermaActive, // explode!
                    mouseover: scope.activateRegion,
                    mouseout: scope.deactivateRegion
                }
                switch (mode.graphType) {
                    case "percent":
                        drawLines(scope.regions, percentLine, callbacks);
                        break;
                    case "index":
                        drawLines(scope.regions, indexLine, callbacks);
                        break;
                }
            }
        }
        
        function drawLines(elements, lineFunction, callbacks) {
            var data = _.reject(elements, {state: "hidden"});
            var countryLines = svgGraph.selectAll("path.graph-line").data(data);
            defineBehavior(countryLines, lineFunction, callbacks); // update
            defineBehavior(countryLines.enter().append("svg:path"), lineFunction, callbacks); // enter
            countryLines.exit().remove(); // exit
        }
        
        function defineCountryNameBehavior(selection) {
            selection
            .attr("class", function(d){ return("countryName countryName-" + d.code) })
            .text(function(d) { return( d.name); })
            .attr("x", function(d) { return x(endYear + 0.2) })
            .attr("y", function(d) { 
                if (Object.keys(d.dataPoints).length == 0) {
                    return 0;
                } else {
                    return y(d.dataPoints["year" + scope.limits.endYear].percent) 
                }
            })
            .attr("text-anchor", "left").attr("dy", 3);
        }
        
        function defineBehavior(selection, lineFunction, callbacks) { // since behavior is same for enter() and update(), pull it into a function
            selection
            .attr("class", callbacks.classFunction)
            .classed("active", function(d) { return d.permaActive })
            .attr("d", function(d) { 
                var visiblePoints = [];
                angular.forEach(d.dataPoints, function(p, yearStr) {
                    if (p.visible) { visiblePoints.push(p) }
                })
                return lineFunction(visiblePoints) 
            })
            .classed('highlighted', function(d) { return (d.state == "highlighted" ? true : false) })
            .on("click", callbacks.click)
            .on("mouseover", callbacks.mouseover)
            .on("mouseout", callbacks.mouseout);
        }
        
        scope.$on('activate', function(event, country) {
            var countryNames = svgGraph.selectAll("text.countryName-" + country.code).data([country]);            
            defineCountryNameBehavior(countryNames.enter().append("svg:text"));
            d3.selectAll("li.country-" + country.code).classed("active", true);
            d3.selectAll("path.country-" + country.code).classed("active", true);
        })
        
        scope.$on('deactivate', function(event, country) {
            if (country.permaActive) { return; }
            d3.selectAll(".country-" + country.code).classed("active", false);
            d3.selectAll(".countryName-" + country.code).remove();

        })

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
                        yVal = p.percent;

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
                        min: Math.floor(yReversed(rect.y + rect.height)),
                        max: Math.floor(yReversed(rect.y))
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
}]);
