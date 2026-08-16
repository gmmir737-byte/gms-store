import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function netlifyFunctionsPlugin(): Plugin {
  return {
    name: 'netlify-functions-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/.netlify/functions/')) {
          const urlPath = req.url.split('?')[0];
          const functionName = urlPath.replace('/.netlify/functions/', '');
          const filePath = path.resolve(__dirname, `netlify/functions/${functionName}.ts`);

          if (fs.existsSync(filePath)) {
            let bodyStr = '';
            req.on('data', (chunk) => {
              bodyStr += chunk;
            });
            req.on('end', async () => {
              try {
                const module = await server.ssrLoadModule(filePath);
                const handler = module.handler || module.default;

                const event = {
                  httpMethod: req.method || 'GET',
                  headers: req.headers,
                  body: bodyStr,
                  queryStringParameters: Object.fromEntries(new URL(req.url!, 'http://localhost').searchParams),
                };

                const result = await handler(event, {});
                res.statusCode = result.statusCode || 200;
                if (result.headers) {
                  for (const [k, v] of Object.entries(result.headers)) {
                    res.setHeader(k, v as string);
                  }
                }
                res.setHeader('Content-Type', 'application/json');
                res.end(typeof result.body === 'string' ? result.body : JSON.stringify(result.body || {}));
              } catch (err: any) {
                console.error(`Error executing Netlify function ${functionName}:`, err);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err?.message || 'Function execution error' }));
              }
            });
            return;
          }
        }
        next();
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), netlifyFunctionsPlugin()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
