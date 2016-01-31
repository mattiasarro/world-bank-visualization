app = angular.module('app', []);

app.controller('GraphController', ["$scope", "$http", "helpers", function($scope, $http, helpers) {
    $scope.mode = {
        dataSource: 'regions', // | regions
        graphType: 'absolute' // percent | growth | absolute | stack
    };
    $scope.growth  = {
        countries: { min: 0, max: 0 },
        regions: { min: 0, max: 0 }
    }
    $scope.absolute  = {
        countries: { min: 0, max: 0 },
        regions: { min: 0, max: 0 }
    }
    $scope.percent = { min: 0, max: 100 }
    $scope.limits = {
        startYear: 1994,
        endYear: 2014,
        min: $scope.percent.min,
        max: $scope.percent.max
    }
    $scope.year = $scope.limits.startYear;
    
    $scope.regions = {
        "ECS": {code: "ECS", name: "Europe and Central Asia", state: "visible"},
        "NAC": {code: "NAC", name: "North America", state: "visible"},
        "LCN": {code: "LCN", name: "Latin America & Caribbean", state: "visible"},
        "EAS": {code: "EAS", name: "East Asia & Pacific", state: "visible"},
        "SAS": {code: "SAS", name: "South Asia", state: "visible"},
        "MEA": {code: "MEA", name: "Middle East & North Africa", state: "visible"},
        "SSF": {code: "SSF", name: "Sub-Saharan Africa", state: "visible"},
    };

    $scope.countries = {};
    var years = d3.range($scope.limits.startYear, $scope.limits.endYear + 1);
    
    $http.get('country-regions.csv').success(function(text) {
        var countriesRegions = {};
        var rows = d3.csv.parseRows(text);
        for (i = 1; i < rows.length; i++) {
          countriesRegions[rows[i][0]] = rows[i][1];
        }

        $http.get('internet-usage-countries.csv').success(function(text) {
            var rows = d3.csv.parseRows(text);
            for (i = 1; i < rows.length; i++) {
                var countryCode = rows[i][3];
                var country = $scope.countries[countryCode];
                var dataPoints = country == undefined || country.dataPoints == undefined ? {} : country.dataPoints;
                var dataPoints = extractData(dataPoints, rows[i], "countries");
                var alpha2 = iso_3366_1_Alpha3_to_Alpha2[countryCode];
                
                if (alpha2 != undefined && Object.keys(dataPoints).length > 0) {
                    $scope.countries[countryCode] = {
                        code: countryCode,
                        codeAlpha2: alpha2,
                        name: rows[i][2],
                        regionCode: countriesRegions[countryCode],
                        state: "visible", // highlighted | hidden
                        dataPoints: dataPoints
                    };
                }
            }
            calculateAbsolute($scope.countries, "countries");
        });
        
        $http.get('internet-usage-regions.csv').success(function(text) {
            var rows = d3.csv.parseRows(text);
            for (i = 1; i < rows.length; i++) {
                var regionCode = rows[i][3];
                var region = $scope.regions[regionCode];
                var dataPoints = region.dataPoints == undefined ? {} : region.dataPoints;
                region.dataPoints = extractData(dataPoints, rows[i], "regions");
            };
            calculateAbsolute($scope.regions, "regions");
        });
        
        function extractData(dataPoints, row, dataSource) {
            var values = row.slice(4, row.length);
            var code = row[3];
            for (j = 0; j < values.length; j++) {
                var value = values[j];
                var year = years[j];
                if (row[0] == "Internet users (per 100 people)") {
                    key = "percent"
                } else if (row[0] == "Population, total") {
                    key = "population";
                }
                if (value == "..") {
                    var lastYear = dataPoints["year" + String(year-1)];
                    if (year == $scope.limits.startYear) {
                        value = 0;
                    } else {
                        value = lastYear[key];
                    }
                }
                if (dataPoints["year" + year] == undefined) {
                    dataPoints["year" + year] = {
                        year: year,
                        visible: true
                    };
                }
                dataPoints["year" + year][key] = value;
                if (key == "percent") {
                    var thisYear = dataPoints["year" + year]
                    var prevYear = dataPoints["year" + String(year - 1)];
                    var growth = thisYear.percent - (prevYear == undefined ? 0 : prevYear.percent);
                    if (growth < $scope.growth[dataSource].min) { $scope.growth[dataSource].min = growth }
                    if (growth > $scope.growth[dataSource].max) { $scope.growth[dataSource].max = growth }
                    dataPoints["year" + year]["percentGrowth"] = growth;
                }
            };
            return dataPoints;
        }

        function calculateAbsolute(areas, dataSource) {
            _.forEach(areas, function(area, key) {
                _.forEach(area.dataPoints, function(dataPoint, year) {
                    var absolute = parseInt(dataPoint.percent / 100 * dataPoint.population);
                    if (absolute < $scope.absolute[dataSource].min) { $scope.absolute[dataSource].min = absolute }
                    if (absolute > $scope.absolute[dataSource].max) { $scope.absolute[dataSource].max = absolute }
                    areas[key]['dataPoints'][year]['absolute'] = absolute;
                    return(dataPoint);
                });
            })
        }
    });

    
    $scope.btnActive = function(dataSource, graphType) {
        var active = $scope.mode.dataSource == dataSource && $scope.mode.graphType == graphType;
        return(active ? "btn-active" : "");
    }
    
    $scope.setMode = function(dataSource, graphType) {
        $scope.mode.dataSource = dataSource;
        $scope.mode.graphType = graphType;
        var limits = angular.copy($scope.limits); // hack, otherwise doesn't trigger changed event
        if (graphType == "percent") {
            limits.min = $scope.percent.min;
            limits.max = $scope.percent.max;
        } else {
            console.log(graphType, dataSource);
            limits.min = $scope[graphType][dataSource].min;
            limits.max = $scope[graphType][dataSource].max;
        }
        $scope.limits = limits;
    }
    
    $scope.togglePermaActive = function(country, fromView) {
        if ($scope.countries[country.code].permaActive) {
            $scope.countries[country.code].permaActive = false;
            $scope.$broadcast('deactivate', country);
        } else {
            $scope.countries[country.code].permaActive = true;
            $scope.$broadcast('activate', country);
        }
        if (!fromView) {
            $scope.$apply();
        }
    }
    
    $scope.activateCountry = function(country) {
        $scope.$broadcast('activate', country);
        d3.selectAll("li.country-" + country.code).classed("active", true);
    }
    
    $scope.deactivateCountry = function(country) {
        d3.selectAll("li.country-" + country.code).classed("active", false);
        $scope.$broadcast('deactivate', country);
    }    
    
    $scope.activateRegion = function(region, fromView) {
        d3.selectAll("a.region-" + region.code).classed("active", true);
        $scope.$broadcast('activate', region);
    }
    
    $scope.deactivateRegion = function(region, fromView) {
        d3.selectAll("a.region-" + region.code).classed("active", false);
        $scope.$broadcast('deactivate', region);

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
}]);