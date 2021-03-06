/* eslint-env node */

const http = require("http");
const path = require("path");
const sirv = require("sirv");

const workerPath = require.resolve("css-to-js-sourcemap-worker");
const wasmPath = path.join(path.dirname(workerPath), "mappings.wasm");

const assets = sirv(path.join(__dirname, "public"));
const worker = sirv(path.dirname(workerPath));
const wasm = sirv(path.dirname(wasmPath));

const routes = {
  "/no-map": "/_static/no-map.js",
  "/inline-map": "/_static/inline-map.js",
  "/external-map": "/_static/external-map.js",
};

function createServer() {
  let blockNetwork = Promise.resolve();
  let unblock = () => {};
  const server = http.createServer((req, res) => {
    blockNetwork.then(() => {
      const script = routes[req.url];
      if (script) {
        res.setHeader("Content-Type", "text/html");
        res.statusCode = 200;
        return void res.end(template(script));
      }
      if (req.url === "/mappings.wasm") {
        return wasm(req, res);
      }
      if (req.url === "/worker.js") {
        return worker(req, res);
      }
      return assets(req, res);
    });
  });
  server.blockAllRequests = () => {
    blockNetwork = new Promise(resolve => {
      unblock = resolve;
    });
  };
  server.unblockAllRequests = () => {
    unblock();
  };
  return server;
}

module.exports = createServer;

function template(url) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8"/>
<script src="${url}"></script>
</head>
<body>
</body>
</html>
`;
}
