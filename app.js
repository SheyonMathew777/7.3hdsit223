const express = require('express');
const client = require('prom-client');
const _ = require('lodash');

const app = express();

// Set up Prometheus metrics
const register = new client.Registry();//demo
client.collectDefaultMetrics({ register });

// Track request duration for monitoring
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'code'],
  buckets: [0.05, 0.1, 0.2, 0.5, 1, 2, 5]
});
register.registerMetric(httpRequestDurationSeconds);

// Add request timing middleware
app.use((req, res, next) => {
  const timer = httpRequestDurationSeconds.startTimer({ method: req.method });
  res.on('finish', () => {
    const route = req.route && req.route.path ? req.route.path : req.path;
    timer({ route, code: res.statusCode });
  });
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Sample Node API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api/hello',
      metrics: '/metrics',
      slow: '/simulate/slow'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});

// Main API endpoint
app.get('/api/hello', (req, res) => {
  const data = { msg: 'world', timestamp: Date.now() };
  res.json(_.pick(data, ['msg', 'timestamp']));
});

// Endpoint to simulate slow responses for alert testing
app.get('/simulate/slow', (req, res) => {
  setTimeout(() => {
    res.json({ delayed: true });
  }, 3000);
});

// Prometheus metrics endpoint
app.get('/metrics', (req, res) => {
  res.set('Content-Type', register.contentType);
  register.metrics().then(metrics => {
    res.end(metrics);
  }).catch(err => {
    res.status(500).end('Error generating metrics');
  });
});

module.exports = app;
