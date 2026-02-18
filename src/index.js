const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');
const app = express();
const PORT = process.env.PORT || 8080;

// Secrets injected by External Secrets Operator → AWS Secrets Manager
const DATABASE_URL = process.env.DATABASE_URL;
const API_SECRET_KEY = process.env.API_SECRET_KEY;

// Load landing page HTML at startup (baked into container image)
let landingHtml;
try {
  landingHtml = fs.readFileSync(path.join(__dirname, 'landing.html'), 'utf8');
} catch (err) {
  console.error('Warning: landing.html not found, browser view disabled');
  landingHtml = null;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(' ');
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

// Main endpoint — content negotiation: HTML for browsers, JSON for APIs
app.get('/', (req, res) => {
  const jsonResponse = {
    message: 'Hello from MyApp on EKS!',
    version: process.env.VERSION || '1.0.0',
    environment: process.env.ENVIRONMENT || 'unknown',
    secrets: {
      database: DATABASE_URL ? 'connected' : 'NOT CONFIGURED',
      apiKey: API_SECRET_KEY ? 'configured' : 'NOT CONFIGURED'
    }
  };

  if (landingHtml && req.accepts('html', 'json') === 'html') {
    const html = landingHtml
      .replace(/<!--SERVER:ENVIRONMENT-->/g, jsonResponse.environment)
      .replace(/<!--SERVER:VERSION-->/g, jsonResponse.version);
    return res.type('html').send(html);
  }

  res.json(jsonResponse);
});

// Live status endpoint (landing page fetches this for dynamic data)
app.get('/api/status', (req, res) => {
  res.json({
    environment: process.env.ENVIRONMENT || 'unknown',
    version: process.env.VERSION || '1.0.0',
    secrets: {
      database: DATABASE_URL ? 'connected' : 'NOT CONFIGURED',
      apiKey: API_SECRET_KEY ? 'configured' : 'NOT CONFIGURED'
    },
    hostname: os.hostname(),
    uptime: formatUptime(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Protected endpoint — requires API_SECRET_KEY from Secrets Manager
app.get('/api/data', (req, res) => {
  if (!API_SECRET_KEY) {
    return res.status(503).json({ error: 'API key not configured (External Secrets not synced)' });
  }

  const provided = req.headers['x-api-key'] || '';
  // Constant-time comparison prevents timing attacks
  const isValid = provided.length === API_SECRET_KEY.length &&
    crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(API_SECRET_KEY));

  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized - invalid API key' });
  }

  res.json({
    data: { users: 42, orders: 156 },
    source: 'secured-endpoint',
    authenticatedWith: 'External Secrets + AWS Secrets Manager'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Database: ${DATABASE_URL ? 'configured' : 'NOT SET'}`);
  console.log(`API Key: ${API_SECRET_KEY ? 'configured' : 'NOT SET'}`);
  console.log(`Landing page: ${landingHtml ? 'loaded' : 'not found'}`);
});
