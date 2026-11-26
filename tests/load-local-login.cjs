// Load the actual compiled Express/Passport routes with only fixed-port/TLS startup omitted.
// The real strategy, SQL authentication and session-file-store remain unchanged.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
module.exports = function loadLocalLogin(root) {
  const entry = path.join(root, 'dist/index.js');
  const code = fs.readFileSync(entry, 'utf8');
  const startup = code.indexOf('http_1.default.createServer(app).listen(3000');
  if (startup < 0) throw new Error('Login startup changed; review the isolated test loader.');
  const module = new Module(entry);
  module.filename = entry;
  module.paths = Module._nodeModulePaths(path.dirname(entry));
  module._compile(code.slice(0, startup) + '\nmodule.exports = app;', entry);
  return module.exports;
};
