/**
 * Programmatic entry point for the sunpeak inspector server.
 *
 * Allows frameworks to start the inspector from their own CLI without
 * shelling out to the `sunpeak inspect` command.
 *
 * Usage:
 *   import { inspectServer } from 'sunpeak/inspect';
 *   await inspectServer({ server: 'http://localhost:8000/mcp', port: 3000 });
 */
export { inspectServer } from '../../commands/inspect.mjs';
