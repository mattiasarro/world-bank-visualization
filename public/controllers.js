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
            var years = d3.range($scope.limits.startYear, $scope.limits.endYear + 1);
            for (i = 1; i < row.length; i++) {
                var values = row[i].slice(4, row[i.length - 1]);
                var countryCode = row[i][3];
                
                dataPoints = {};
                for (j = 0; j < values.length; j++) {
                    var perCent = values[j];
                    var year = years[j];
                    
                    if (perCent == "..") {
                        var lastYear = dataPoints["year" + String(year-1)];
                        if (year == $scope.limits.startYear) {
                            perCent = 0;
                        } else {
                            perCent = lastYear.perCent;
                        }
                    }
                    dataPoints["year" + year] = {
                        year: year,
                        perCent: perCent,
                        visible: true
                    };
                };
                
                var alpha2 = iso_3366_1_Alpha3_to_Alpha2[countryCode];
                
                if (alpha2 != undefined && Object.keys(dataPoints).length > 0) {
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