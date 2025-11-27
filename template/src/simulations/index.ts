/**
 * Server-safe tool configurations
 * Safe to import in Node.js/MCP server contexts.
 */
export { TOOL_CONFIGS, type ToolConfig, type ToolName } from './tool-configs';

/**
 * Simulations - DO NOT import in Node.js/MCP server contexts!
 * These include React components and CSS imports.
 */
export { counterSimulation, albumsSimulation, carouselSimulation, simulations } from './simulations';
