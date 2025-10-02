const request = require('supertest');

// Because app is started separately in server.js, we hit the running server
const BASE = process.env.TEST_BASE || 'http://localhost:3000';

describe('API', () => {
  test('GET /api/hello', (done) => {
    request(BASE).get('/api/hello')
      .then(res => {
        expect(res.status).toBe(200);
        expect(res.body.msg).toBe('world');
        done();
      })
      .catch(done);
  });

  test('GET /health', (done) => {
    request(BASE).get('/health')
      .then(res => {
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        done();
      })
      .catch(done);
  });
});
