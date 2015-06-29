var express = require('express');
var fs = require('fs');
var R = require('ramda');
var Promise = require('bluebird');
var app = express();

module.exports.start = function(options) {
  var data = JSON.parse(fs.readFileSync(options.report_dir + '/result.json'));

  app.use(express.static('static'));

  if (options.logging) {
    app.use(function (req, res, next) {
      var start = Date.now();
      try {
        next();
      } finally {
        var end = Date.now();
        console.log(new Date().toISOString(), req.method, req.url, (end-start)+ 'ms');
      }
    });
  }

  app.get('/api/summary', function (req, res) {
    res.json({
      length: data.length
    });
  });

  app.get('/api/n/:number', function (req, res) {
    res.json(data[req.params.number]);
  });

  app.get('/api/options', function (req, res) {
    res.json(aggregateOptions(req.query));
  });

  app.get('/api/search', function (req, res) {
    res.json(filterData(req.query));
  });

  return Promise.promisify(app.listen, app)(options.port);

  function filterEquals(filter) {
    return function(obj) {
      var pass = true;
      R.keys(filter).forEach(function(key) {
        if (''+obj.params[key] != filter[key]) {
          pass = false;
        }
      });
      return pass;
    };
  }

  function getOptionsForEntry(entry) {
    return R.merge(entry.params, {'dimension': R.keys(entry.stats) });
  }

  function aggregateOptions(filter) {
    filter = filter || {}; // match all if filter not set
    var options = {};
    data
    .filter(filterEquals(filter))
    .forEach(function(d) {
      R.mapObjIndexed(function(val, param) {
        var valArray = R.isArrayLike(val) ? val : [val];
        if (! options[param]) {
          options[param] = valArray;
        } else if (options[param].indexOf(val) === -1) {
          options[param] = R.uniq(R.concat(options[param], valArray));
        }
      }, getOptionsForEntry(d));
    });
    return options;
  }

  function filterData(filter) {
    var stats_funs = ['q1', 'q2', 'q3', 'min', 'max', 'stddev', 'q9', 'q99', 'mean'];
    var n = 1*filter._n || 0;
    var size = 1*filter._size || 10;
    size = Math.min(size, 10);
    statsFun = stats_funs.indexOf(filter._statsfun) > -1 && filter._statsfun || 'mean';
    var dimension = filter.dimension;
    filter = R.omit(['_n', '_size', '_statsfun', 'dimension'], filter);

    if (!dimension) {
      return {error: 'dimension required'};
    }
    var out = data.filter(filterEquals(filter))
    .sort(sortByStatsFun(statsFun, dimension));

    var stats_ranges = {};
    out.forEach(function (hit) {
      R.keys(hit.stats).forEach(function (dimension) {
        R.keys(hit.stats[dimension]).forEach(function (stat) {
          if (! stats_ranges[dimension]) {
            stats_ranges[dimension] = {};
          }
          if (! stats_ranges[dimension][stat]) {
            stats_ranges[dimension][stat] = [hit.stats[dimension][stat], hit.stats[dimension][stat]];
          } else {
            stats_ranges[dimension][stat] = [
              Math.min(stats_ranges[dimension][stat][0], hit.stats[dimension][stat]),
              Math.max(stats_ranges[dimension][stat][1], hit.stats[dimension][stat])
            ];
          }
        });
      });
    });
    return {
      total: out.length,
      stats_ranges: stats_ranges,
      n: n*size,
      size: size,
      hits: out.slice(n*size, (n +1) * size)
    };
  }

  function sortByStatsFun(funName, dimension) {
    var higherIsBetter = ['throughput'];
    var asc = higherIsBetter.indexOf(dimension) > -1 ? -1 : 1;
    return function sortByStats(a, b) {
        return asc * (a.stats[dimension][funName] - b.stats[dimension][funName]);
    }
  }
}
