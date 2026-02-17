const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Readiness check endpoint
app.get('/ready', (req, res) => {
  res.status(200).json({ status: 'ready' });
});

// Main endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Hello from MyApp on EKS!',
    version: process.env.VERSION || '1.0.0',
    environment: process.env.ENVIRONMENT || 'unknown'
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
