const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { initDb } = require('./db');
const childrenRoutes = require('./routes/children');
const databaseRoutes = require('./routes/database');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3001;
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
fs.mkdirSync(dataDir, { recursive: true });

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://127.0.0.1:5175'] }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/children', childrenRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

const isElectronServe = process.env.ELECTRON_SERVE === '1';
const staticDir = process.env.STATIC_DIR;
if (isElectronServe && staticDir && fs.existsSync(staticDir)) {
  app.use(express.static(staticDir));
  app.get('*', (req, res) => {
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) res.sendFile(indexPath);
    else res.status(404).send('Not found');
  });
}

const requestedPort = Number(PORT) || 3001;

function tryListen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => resolve(server));
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && process.env.ELECTRON_STRICT_PORTS !== '1') {
        console.warn(`Port ${port} in use, trying ${port + 1}...`);
        tryListen(port + 1).then(resolve).catch(reject);
      } else reject(err);
    });
  });
}

initDb()
  .then(() => tryListen(requestedPort))
  .then((server) => {
    const port = server.address().port;
    console.log(`B-TRACE server running on http://localhost:${port}`);
    if (port !== requestedPort) console.log(`If using Vite, set VITE_API_URL=http://localhost:${port}/api`);
  })
  .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
