var app = angular.module('app', []);
app.filter('anyParams', function() {
  return function(hit, allOptions) {
    var ret = {};
    allOptions.filter(function (opt) {
      return opt.selected === undefined || (opt.selected.value === undefined);
    })
    .forEach(function (opt) {
      ret[opt.name] = hit[opt.name];
    });
    return ret;
  }
});

app.controller('DiagramCtrl', function($scope, dataModel) {
  $scope.R = R;
  $scope.config = {};
  $scope.page = 0;
  $scope.allOptions = [];

  var labels = {
    product: {label: ''},
    dimension: {label: '$ of'},
    language: {label: 'client written in'},
    queueDurable: {label: ', $ queue', options: {'true': 'durable', 'false': 'non-durable'}},
    autoAck: {label: ' and ack is ', options: {'true': '', 'false': ''}},
    producers: {label: ' has $ producers'},
    deliveryMode: {label: '$ messages', options: {'1': 'non-persistent', '2': 'persistent'}},
    prefetchCount: {label: ' at most $ prefetched messages'},
    msgSendDelay: {label: ' messages are sent with $ delay', options: {0: 'no'}},
    msgSize: {label: ' messages of $ bytes'},
    time: {label: ' each message is sent every $ msec'},

    q1: '0.25 quantile',
    q2: 'median',
    q3: '0.75 quantile',
    q9: '0.90 quantile',
    q99: '0.99 quantile',
    stddev: 'standard dev.'
  };
  $scope.labels = labels;

  dataModel.summary
  .then(function(summary) {
    $scope.length = summary.length;
  });

  dataModel.options
  .then(function(options) {
    R.keys(options).forEach(function(option) {
      var opt = {name: option};
      opt.options = options[option].map(function(value) {
        return {value: value, label: R.path('options.'+value, labels[option]) || value};
      });
      if (options[option].length > 1) {
        opt.options.push({value: undefined, label: '...'});
      }
      if (labels[option]) {
        var labelparts = labels[option].label.split('$');
        opt.label = labelparts[0];
        opt.label2 = labelparts[1];
      } else {
        opt.label = '{'+option+'}';
      }
      $scope.allOptions.push(opt);
    });
    var dimension = R.find(R.where({name: 'dimension'}), $scope.allOptions);
    var productDetail = R.find(R.where({name: 'product'}), $scope.allOptions);

    dimension.selected = R.find(R.where({value:'throughput'}), dimension.options) || dimension.options[0];
    productDetail.selected = R.find(R.where({value:undefined}), productDetail.options) || productDetail.options[0];
    $scope.options = [dimension, productDetail];
    $scope.dimension = dimension;
    $scope.product = productDetail;
    $scope.details = $scope.allOptions.filter(function(opt) {return $scope.options.indexOf(opt) == -1; });

    $scope.find();
  });

  $scope.find = function() {
    var query = {_n: $scope.page, _statsfun: $scope.selected_statfun };
    $scope.allOptions.forEach(function (opt) {
      if (opt.selected) {
        query[opt.name] = opt.selected.value;
      }
    });
    dataModel.search(query)
    .then(function (result) {
      result.hits.forEach(function (hit) {
        hit.sysinfo.MemTotal = humanizeKbSize(parseInt(hit.sysinfo.MemTotal));
      });
      $scope.result = result;
    });
  };

  $scope.selectOption = function(option, detail) {
    if (option.value === undefined) {
      detail.selected = undefined;
    } else {
      detail.selected = option;
    }
    $scope.find();
  }

  $scope.selectOptionAny = function(detail) {
    detail.selected = undefined; //R.find(R.where({value:undefined}), detail.options);
    $scope.find();
  }

  $scope.selected = function() {
    if (!$scope.details) {
      return [];
    }
    return $scope.details.filter(R.not(R.where({selected: undefined})));
  }

  $scope.selectedNotAny = function() {
    if (!$scope.details) {
      return [];
    }
    return $scope.details.filter(function(d) {return d.selected != undefined && d.selected.value != undefined; });
  }

  $scope.notSelected = function() {
    if (!$scope.details) {
      return [];
    }
    return $scope.details.filter(R.where({selected: undefined}));
  }

  $scope.stats_funcs = ['q1', 'q2', 'q3', 'min', 'max', 'stddev', 'q9', 'q99', 'mean'];
  $scope.selected_statfun = 'q99';

  $scope.notAnyOptions = function(hit) {
    var ret = $scope.allOptions.filter(function (opt) {
      return opt.selected != undefined || (opt.selected.value != undefined);
    })
    .map(function (opt) {
      return R.mixin(opt, {value: hit.params[opt.name]});
    });
    return ret;
  }

  $scope.pageBack = function() {
    if ($scope.page == 0) {
      return;
    }
    $scope.page--;
    $scope.find();
  }

  $scope.pageNext = function() {
    if (($scope.page+1)*$scope.result.size > $scope.result.total) {
      return;
    }
    $scope.page++;
    $scope.find();
  }

  $scope.pagesCount = function() {
    return $scope.result && Math.ceil($scope.result.total / $scope.result.size) || 0;
  }

  function humanizeKbSize(num) {
    var units = ['kB', 'MB', 'GB'];
    unit = 0;
    while ((num > 1000) && (unit < units.length)) {
      unit++;
      num = num/1000;
    }
    return Math.floor(num) + units[unit];
  }
});

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
