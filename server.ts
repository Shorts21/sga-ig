import 'dotenv/config';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { apiRouter } from './src/api';

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // As rotas da API DEVEM vir ANTES do middleware do Vite
  // Para garantir que /api/* seja processado pelo Express e não pelo roteador SPA do Vite
  app.use('/api', apiRouter);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Em produção servimos arquivos estáticos
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is listening on port ${PORT}`);
    console.log(`🔹 API: http://localhost:${PORT}/api/health`);
  });
}

createServer();
