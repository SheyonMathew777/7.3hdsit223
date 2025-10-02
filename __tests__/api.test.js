const request = require('supertest');
const app = require('../app'); // import the Express app

describe('API (in-process)', () => {
  it('GET /api/hello', (done) => {
    request(app).get('/api/hello')
      .then(res => {
        expect(res.status).toBe(200);
        expect(res.body.msg).toBe('world');
        done();
      })
      .catch(done);
  });

  it('GET /health', (done) => {
    request(app).get('/health')
      .then(res => {
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        done();
      })
      .catch(done);
  });

  it('GET /', (done) => {
    request(app).get('/')
      .then(res => {
        expect(res.status).toBe(200);
        expect(res.body.message).toBe('Welcome to Sample Node API');
        expect(res.body.version).toBe('1.0.0');
        done();
      })
      .catch(done);
  });

  it('GET /metrics', (done) => {
    request(app).get('/metrics')
      .then(res => {
        expect(res.status).toBe(200);
        expect(res.text).toContain('process_cpu_user_seconds_total');
        done();
      })
      .catch(done);
  });

  it('GET /simulate/slow', (done) => {
    request(app).get('/simulate/slow')
      .then(res => {
        expect(res.status).toBe(200);
        expect(res.body.delayed).toBe(true);
        done();
      })
      .catch(done);
  });

  it('GET /metrics error handling', (done) => {
    // Mock the register.metrics() to throw an error
    const originalMetrics = require('prom-client').Registry.prototype.metrics;
    require('prom-client').Registry.prototype.metrics = function() {
      return Promise.reject(new Error('Metrics generation failed'));
    };

    request(app).get('/metrics')
      .then(res => {
        expect(res.status).toBe(500);
        expect(res.text).toBe('Error generating metrics');
        
        // Restore original method
        require('prom-client').Registry.prototype.metrics = originalMetrics;
        done();
      })
      .catch(err => {
        // Restore original method
        require('prom-client').Registry.prototype.metrics = originalMetrics;
        done(err);
      });
  });
});
