import { createServer } from 'net';
import { execFileSync } from 'child_process';

/**
 * Synchronous version of getPort — safe to call at Playwright config load time.
 * Spawns a tiny Node child process that binds, prints the port, and exits.
 *
 * @param {number} preferred - Port to try first
 * @returns {number} The available port number
 */
export function getPortSync(preferred) {
  // The argument is interpolated into a small Node script; an invalid value
  // (non-integer) would corrupt the script and could execute arbitrary code if
  // a caller ever forwards user-controlled input here. Validate strictly.
  if (!Number.isInteger(preferred) || preferred < 0 || preferred > 65535) {
    throw new TypeError(`getPortSync: preferred must be an integer in [0, 65535], got ${preferred}`);
  }
  const script = `
    const s = require("net").createServer();
    s.listen(${preferred}, "127.0.0.1", () => {
      process.stdout.write(String(s.address().port));
      s.close();
    });
    s.on("error", () => {
      const f = require("net").createServer();
      f.listen(0, "127.0.0.1", () => {
        process.stdout.write(String(f.address().port));
        f.close();
      });
    });
  `;
  // execFileSync (not execSync) avoids invoking a shell, so the script body
  // is passed as a literal arg without any quoting concerns.
  return Number(execFileSync(process.execPath, ['-e', script], { encoding: 'utf-8' }).trim());
}

/**
 * Find an available TCP port, preferring the given port.
 * If the preferred port is in use, returns a random available port.
 *
 * Probes 127.0.0.1 because sunpeak dev/test servers bind there. Binding to
 * the platform default can miss conflicts from processes already bound to
 * 127.0.0.1 on macOS.
 *
 * @param {number} preferred - Port to try first (default: 0 = any available)
 * @returns {Promise<number>} The available port number
 */
export function getPort(preferred = 0) {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(preferred, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE' && preferred !== 0) {
        // Preferred port is busy — get any available port
        const fallback = createServer();
        fallback.listen(0, '127.0.0.1', () => {
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
