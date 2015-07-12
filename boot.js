var server = require('./server');
server.start({
  port: process.env.PORT || 3000,
  report_dir: process.env.REPORT_DIR || '.',
  frontend_options: {
    raw_data_location: process.env.RAW_DATA_LOCATION || 'http://localhost:8080/'
  }
});
