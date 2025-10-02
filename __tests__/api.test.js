const request = require('supertest');
const app = require('../app'); // import the Express app

describe('API (in-process)', () => {
  it('GET /api/hello', async () => {
    const res = await request(app).get('/api/hello');
    expect(res.status).toBe(200);
    expect(res.body.msg).toBe('world');
  });

  it('GET /health', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('GET /', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Welcome to Sample Node API');
    expect(res.body.version).toBe('1.0.0');
  });

  it('GET /metrics', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('process_cpu_user_seconds_total');
  });

  it('GET /simulate/slow', async () => {
    const res = await request(app).get('/simulate/slow');
    expect(res.status).toBe(200);
    expect(res.body.delayed).toBe(true);
  });
});
