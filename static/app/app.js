var app = angular.module('app', ['ui.router']);

app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');

    $stateProvider
        .state('home', {
            url:'/',
            templateUrl: 'templates/results.html'
        })
        .state('runDetails', {
            url:'/run/:id',
            templateUrl: 'templates/runDetails.html'
        })

}]);

app.filter('humanizeKbSize', function() {
  return function(num) {
    num = parseInt(num);
    var units = ['kB', 'MB', 'GB'];
    unit = 0;
    while ((num > 1000) && (unit < units.length)) {
      unit++;
      num = num/1000;
    }
    return Math.floor(num) + units[unit];
  }
});

app.filter('anyParams', function() {
  return function(hit, allOptions) {
    return allOptions.filter(function (opt) {
      return opt.selected === undefined || (opt.selected.value === undefined);
    })
    .map(function (opt) {
      return hit[opt.name];
    });
  }
});
