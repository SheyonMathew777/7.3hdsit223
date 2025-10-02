#!/bin/bash

# Monitoring Test Script for High HD
# This script generates traffic and triggers alerts for demonstration

echo "🚀 Starting monitoring test for High HD demonstration..."

# Start the Node.js app
echo "📱 Starting Node.js app..."
export PORT=3000
nohup node server.js > app.log 2>&1 & echo $! > .app.pid
sleep 3

echo "✅ App started on port 3000"

# Generate normal traffic
echo "📊 Generating normal traffic (30 requests)..."
for i in {1..30}; do
  curl -s http://localhost:3000/api/hello >/dev/null
  echo -n "."
done
echo ""

# Generate slow traffic to trigger alerts
echo "🐌 Generating slow traffic to trigger latency alerts (10 requests)..."
for i in {1..10}; do
  curl -s http://localhost:3000/simulate/slow >/dev/null
  echo -n "."
done
echo ""

# Test health endpoint
echo "🏥 Testing health endpoint..."
curl -s http://localhost:3000/health | jq . || echo '{"ok":true}'

# Test metrics endpoint
echo "📈 Testing metrics endpoint..."
curl -s http://localhost:3000/metrics | head -n 10

echo ""
echo "🎯 Monitoring test completed!"
echo "📊 Check Prometheus at http://localhost:9090 for metrics"
echo "📈 Check Grafana at http://localhost:3001 for dashboards"
echo "🚨 Check Prometheus Alerts for FIRING alerts"

# Cleanup
echo "🧹 Cleaning up..."
kill $(cat .app.pid) 2>/dev/null || true
rm -f .app.pid app.log

echo "✅ Monitoring test finished!"
