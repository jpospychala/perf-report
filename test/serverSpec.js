var expect = require('chai').expect;
var Promise = require('bluebird');
var request = Promise.promisify(require('request'));
var server = require('../server');
var R = require('ramda');

describe('server', function() {
  before(function() {
    var options = {
      port: 8799,
      report_dir: 'test/',
      frontend_options: {
        raw_data_location: 'http://localhost/'
      },
      logging: false
    }
    return server.start(options);
  });

  it('should expose summary', function() {
    return request("http://localhost:8799/api/summary", {json: true}).then(function(result) {
      expect(result[1]).to.deep.equal({
        length: 80,
        raw_data_location: 'http://localhost/'
      });
    });
  });

  it('should expose aggregated options', function() {
    return request("http://localhost:8799/api/options", {json: true}).then(function(result) {
      expect(result[1]).to.deep.equal({
        dimension: ['stat1', 'stat2'],
        language: ['c', 'nodejs'],
        n: [2, 10],
        product: ['sleep'],
        time: [0, 5, 10, 50],
        machine: ['local0']
      });
    });
  });

  it('should return nth result', function() {
    return request("http://localhost:8799/api/n/0", {json: true}).then(function(result) {
      expect(result[1].id).to.deep.equal("62e5cccdd2ab2c2d6186d68c9a5a0248");
    });
  });

  it('should require dimension param in search', function() {
    return request("http://localhost:8799/api/search?_n=0&_size=1", {json: true}).then(function(result) {
      expect(result[1]).to.deep.equal({error: 'dimension required'});
    });
  });

  it('should expose search metadata', function() {
    return request("http://localhost:8799/api/search?_size=1&dimension=stat1", {json: true}).then(function(result) {
      expect(R.omit(['stats_ranges', 'hits'], result[1])).to.deep.equal({n:0, size: 1, total: 80});
    });
  });

  it('should expose nth search match', function() {
    return request("http://localhost:8799/api/search?_n=0&_size=1&dimension=stat1", {json: true}).then(function(result) {
      expect(result[1].hits[0].id).to.deep.equal("62e5cccdd2ab2c2d6186d68c9a5a0248");
    });
  });

  it('should correctly sort page search matches', function() {
    return request("http://localhost:8799/api/search?_n=1&dimension=stat1", {json: true}).then(function(result) {
      expect(result[1].hits[0].id).to.deep.equal("b4d27294f0d5a006f312f11a09c8b5ba");
    });
  });

  it('should expose nth search stats ranges', function() {
    return request("http://localhost:8799/api/search?_n=0&_size=1&dimension=stat1", {json: true}).then(function(result) {
      expect(result[1].stats_ranges.stat1.mean).to.deep.equal([0, 20]);
    });
  });
});
