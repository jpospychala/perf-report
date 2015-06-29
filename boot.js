var server = require('./server');
server.start({
  port: process.env.PORT || 3000,
  report_dir: process.env.REPORT_DIR || '.'
});
