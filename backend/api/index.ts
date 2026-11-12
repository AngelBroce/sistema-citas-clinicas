/**
 * Punto de entrada serverless para Vercel.
 * Reutiliza la app Express definida en src/server.ts (que no llama a listen() en Vercel).
 */
import app from '../src/server.js';

export default app;
