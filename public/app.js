angular.module('vis', [])
    .controller('GraphController', function() {
        console.log("as");
        var graph = this;
        graph.areas = [
            {id: "EAS", name: "East Asia and Pacific"},
            {id: "SAS", name: "South Asia"},
            {id: "ECS", name: "Europe and Central Asia"},
            {id: "MEA", name: "Middle East and North Africa"},
            {id: "SSF", name: "Sub-Saharan Africa"},
            {id: "LCN", name: "Latin America and Caribbean"},
            {id: "NAC", name: "North America"}
        ];

});