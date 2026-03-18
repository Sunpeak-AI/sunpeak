import { createServer } from 'net';
import { execSync } from 'child_process';

/**
 * Synchronous version of getPort — safe to call at Playwright config load time.
 * Spawns a tiny Node child process that binds, prints the port, and exits.
 *
 * @param {number} preferred - Port to try first
 * @returns {number} The available port number
 */
export function getPortSync(preferred) {
  const script = `
    const s = require("net").createServer();
    s.listen(${preferred}, () => {
      process.stdout.write(String(s.address().port));
      s.close();
    });
    s.on("error", () => {
      const f = require("net").createServer();
      f.listen(0, () => {
        process.stdout.write(String(f.address().port));
        f.close();
      });
    });
  `;
  return Number(execSync(`node -e '${script}'`, { encoding: 'utf-8' }).trim());
}

/**
 * Find an available TCP port, preferring the given port.
 * If the preferred port is in use, returns a random available port.
 *
 * Listens without specifying a host so Node.js uses dual-stack `::`,
 * which detects conflicts on both IPv4 and IPv6 interfaces.
 *
 * @param {number} preferred - Port to try first (default: 0 = any available)
 * @returns {Promise<number>} The available port number
 */
export function getPort(preferred = 0) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(preferred, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && preferred !== 0) {
        // Preferred port is busy — get any available port
        const fallback = createServer();
        fallback.listen(0, () => {
          const { port } = fallback.address();
          fallback.close(() => resolve(port));
        });
        fallback.on('error', reject);
      } else {
        reject(err);
      }
    });
  });
}
