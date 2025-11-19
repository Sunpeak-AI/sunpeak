import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Convert absolute path to Vite's /@fs/ virtual URL
function toViteFsPath(absolutePath: string): string {
  return `/@fs/${absolutePath}`;
}

// ChatGPT dev endpoint plugin
function chatgptDevEndpoint(): Plugin {
  const chatgptPath = path.resolve(__dirname, 'simulations/chatgpt/main.tsx');

  return {
    name: 'chatgpt-dev-endpoint',

    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';

        // Home page
        if (url === '/' || url === '/index.html') {
          res.setHeader('Content-Type', 'text/html');
          res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sunpeak</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <style>
    :root {
      --bg-color: #ffffff;
      --text-color: #333333;
      --text-muted: #666666;
      --link-color: #0066cc;
      --hover-bg: #f0f0f0;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #1a1a1a;
        --text-color: #e0e0e0;
        --text-muted: #a0a0a0;
        --link-color: #4d9fff;
        --hover-bg: #2a2a2a;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      line-height: 1.6;
      background-color: var(--bg-color);
      color: var(--text-color);
      transition: background-color 0.3s, color 0.3s;
    }
    h1 { color: var(--text-color); }
    p { color: var(--text-muted); }
    ul { list-style: none; padding: 0; }
    li { margin: 10px 0; }
    a {
      color: var(--link-color);
      text-decoration: none;
      font-size: 18px;
      padding: 10px 15px;
      display: block;
      border-radius: 8px;
      transition: background-color 0.2s;
    }
    a:hover {
      background-color: var(--hover-bg);
    }
  </style>
</head>
<body>
  <h1>Sunpeak</h1>
  <h2>Platforms</h2>
  <ul>
    <li><a href="/chatgpt">ChatGPT</a></li>
  </ul>
</body>
</html>
        `);
          return;
        }

        // ChatGPT page
        if (url === '/chatgpt') {
          res.setHeader('Content-Type', 'text/html');
          res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ChatGPT - Sunpeak</title>
  <link rel="icon" type="image/x-icon" href="/favicon.ico">
  <style>
    :root {
      --bg-color: #ffffff;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #1a1a1a;
      }
    }

    body {
      background-color: var(--bg-color);
      transition: background-color 0.3s;
      margin: 0;
    }
  </style>
  <script type="module">
    import RefreshRuntime from '/@react-refresh';

    if (!window.__vite_plugin_react_preamble_installed__) {
      RefreshRuntime.injectIntoGlobalHook(window);
      window.$RefreshReg$ = () => {};
      window.$RefreshSig$ = () => (type) => type;
      window.__vite_plugin_react_preamble_installed__ = true;
    }
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="${toViteFsPath(chatgptPath)}"></script>
</body>
</html>
        `);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
      include: /simulations\/.*\.(tsx|jsx)$/,
    }),
    chatgptDevEndpoint(),
  ],
  publicDir: 'assets',
  server: {
    port: 6768,
    strictPort: true,
  },
  resolve: {
    alias: {
      sunpeak: path.resolve(__dirname, 'src/index.ts'),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
});
