app.service('dataModel', function($http, $q) {
  return new function() {
    var self = this;
    self.summary = $http.get('/api/summary').then(R.path('data'));
    self.options = $http.get('/api/options').then(R.path('data'));
    self.search = function(query) {
      return $http.get('/api/search', {params: query}).then(R.path('data'));
    }
    self.n = function(n) {
      return $http.get('/api/n/'+n).then(R.path('data'));
    }
  };
});
