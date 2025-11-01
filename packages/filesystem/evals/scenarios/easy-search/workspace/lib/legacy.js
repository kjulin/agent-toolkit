const fs = require('fs');

module.exports = function readSync(path) {
  return fs.readFileSync(path, 'utf-8');
};
