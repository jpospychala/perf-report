var express = require('express');
var fs = require('fs');
var R = require('ramda');
var app = express();

app.use(express.static('static'));

var data = JSON.parse(fs.readFileSync('report/result0.json'));

function filterEquals(filter) {
  return function(obj) {
    var pass = true;
    R.keys(filter).forEach(function(key) {
      if (obj.params[key] != filter[key]) {
        pass = false;
      }
    });
    return pass;
  };
}

function filterAny(filter) {
  return function(obj) {
    // costam costam
  }
}

function aggregateOptions(filter) {
  filter = filter || {}; // match all if filter not set
  var options = {};
  data
  .filter(filterEquals(filter))
  .forEach(function(d) {
    R.keys(d.params).forEach(function(param) {
      var val = d.params[param];
      if (! options[param]) {
        options[param] = [val]
      } else if (options[param].indexOf(val) === -1) {
        options[param].push(val);
      }
    });
  });
  return options;
}

function filterData(filter) {
  return data.filter(filterAny(filter));
}

app.use(function (req, res, next) {
  console.log(req.method, req.url);
  next();
});

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

app.listen(3000, function () {
  console.log('started');
});
