app = angular.module('app', []);

app.controller('GraphController', function($scope, $http) {
    $scope.mode = {
        dataSource: 'countries', // | regions
        graphType: 'percent' // | index | absolute | stack
    };
    $scope.growth  = { min: 0, max: 0 }
    $scope.percent = { min: 0, max: 100 }
    $scope.limits = {
        startYear: 1994,
        endYear: 2014,
        min: $scope.percent.min,
        max: $scope.percent.max
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
                var dataPoints = extractData({}, rows[i]);
                var alpha2 = iso_3366_1_Alpha3_to_Alpha2[countryCode];
                
                if (alpha2 != undefined && Object.keys(dataPoints).length > 0) {
                    $scope.countries[countryCode] = {
                        code: countryCode,
                        codeAlpha2: alpha2,
                        name: rows[i][2],
                        regionCode: countriesRegions[countryCode], // ECS | NAN, etc
                        active: false,
                        state: "visible", // highlighted | hidden
                        dataPoints: dataPoints
                    };
                }
            }
        });
        
        function extractData(dataPoints, row) {
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
                    if (growth < $scope.growth.min) { $scope.growth.min = growth }
                    if (growth > $scope.growth.max) { $scope.growth.max = growth }
                    dataPoints["year" + year]["percentGrowth"] = growth;
                }
            };
            return dataPoints;
        }

        $http.get('internet-usage-regions.csv').success(function(text) {
            var rows = d3.csv.parseRows(text);
            for (i = 1; i < rows.length; i++) {
                var regionCode = rows[i][3];
                var region = $scope.regions[regionCode];
                var dataPoints = region.dataPoints == undefined ? {} : region.dataPoints;
                $scope.regions[regionCode].dataPoints = extractData(dataPoints, rows[i]);
            }
        });
    });

    
    $scope.btnActive = function(dataSource, graphType) {
        var active = $scope.mode.dataSource == dataSource && $scope.mode.graphType == graphType;
        return(active ? "btn-active" : "");
    }
    
    $scope.setMode = function(dataSource, graphType) {
        $scope.mode.dataSource = dataSource;
        $scope.mode.graphType = graphType;
        if (graphType == "index") {
            $scope.limits.min = $scope.growth.min;
            $scope.limits.max = $scope.growth.max;
        } else if (graphType == "percent") {
            $scope.limits.min = $scope.percent.min;
            $scope.limits.max = $scope.percent.max;
        }
    }
    
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