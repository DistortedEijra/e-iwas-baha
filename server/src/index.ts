import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { pool } from './db/index.js';
import { loadGraph } from './routing/graph.js';
import { routeRouter } from './routes/route.js';
import { reportsRouter } from './routes/reports.js';
import { evacCentersRouter } from './routes/evac-centers.js';
import { adminRouter } from './routes/admin.js';
import { uatRouter } from './routes/uat.js';
import { floodZonesRouter } from './routes/flood-zones.js';
import { requireAdmin } from './middleware/adminAuth.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
export const io = new Server(httpServer, { cors: { origin: '*' } });

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'db_unavailable' });
  }
});

// Public endpoints
app.use('/api/evac-centers', evacCentersRouter(pool));
app.use('/api/uat', uatRouter(pool));
app.use('/api/flood-zones', floodZonesRouter(pool));

io.on('connection', (socket) => {
  console.log('client connected:', socket.id);
  socket.on('disconnect', () => console.log('client disconnected:', socket.id));
});

const PORT = process.env.PORT ?? 3001;

async function main() {
  const graph = await loadGraph(pool);

  // Graph-dependent endpoints
  app.use('/api/route', routeRouter(pool, graph));
  app.use('/api/reports', reportsRouter(pool, graph, io));
  app.use('/api/admin', requireAdmin, adminRouter(pool, graph, io));

  httpServer.listen(PORT, () => console.log(`Server running on :${PORT}`));
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
