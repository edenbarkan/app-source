const { describe, it, after, before } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');

const app = require('../index');

let server;
let baseUrl;

before((_, done) => {
  server = app.listen(0, () => {
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
    done();
  });
});

after((_, done) => {
  server.close(done);
});

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const req = http.get(url, { headers }, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: JSON.parse(body) });
      });
    });
    req.on('error', reject);
  });
}

describe('API endpoints', () => {
  it('GET /health returns 200', async () => {
    const res = await get('/health');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, { status: 'healthy' });
  });

  it('GET /ready returns 200', async () => {
    const res = await get('/ready');
    assert.strictEqual(res.status, 200);
    assert.deepStrictEqual(res.body, { status: 'ready' });
  });

  it('GET / returns JSON with app info', async () => {
    const res = await get('/', { Accept: 'application/json' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message);
    assert.ok(res.body.version);
    assert.ok(res.body.environment);
    assert.ok(res.body.secrets);
  });

  it('GET /api/status returns live status', async () => {
    const res = await get('/api/status');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.hostname);
    assert.ok(res.body.uptime);
    assert.ok(res.body.timestamp);
  });

  it('GET /api/data rejects unauthenticated requests', async () => {
    const res = await get('/api/data');
    // 503 when API_SECRET_KEY env is not set, 401 when key is wrong
    assert.ok([401, 503].includes(res.status));
    assert.ok(res.body.error);
  });

  it('GET /nonexistent returns 404', async () => {
    const res = await get('/nonexistent');
    assert.strictEqual(res.status, 404);
    assert.deepStrictEqual(res.body, { error: 'Not Found' });
  });
});
