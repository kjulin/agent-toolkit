import express from 'express';

export function createServer() {
  const app = express();

  app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({ status: 'ok' });
  });

  app.post('/api/users', (req, res) => {
    console.log('Creating new user');
    // User creation logic
    res.status(201).send();
  });

  return app;
}
