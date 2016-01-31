angular.module('app').factory('helpers', function() {
    var helpers = {}
    
    return helpers;
})

app.filter('orderObjectBy', function(){
 return function(input, attribute) {
    if (!angular.isObject(input)) return input;

    var array = [];
    for(var objectKey in input) {
        if (!_.includes(["MAF", "SXM", "CUW", "SSD", "MNP"], objectKey)) {
            array.push(input[objectKey]);
        }
    }

    array.sort(function(a, b){
        a = parseInt(a[attribute]);
        b = parseInt(b[attribute]);
        return a - b;
    });
    return array;
 }
});