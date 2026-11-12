#!/usr/bin/env node
/**
 * ====================================================================
 *  🏥 MedPulse - Orquestador de Inicio Unificado para Desarrollo Local
 * ====================================================================
 *  Inicia simultáneamente:
 *   1. Backend (Express + TypeScript + PostgreSQL) -> http://localhost:4000
 *   2. Frontend (Astro + Tailwind/Clinical Pulse Dark) -> http://localhost:4321
 *
 *  Características:
 *   - Compatible 100% con Windows (bypasea restricción de scripts de PowerShell).
 *   - Cierre limpio de procesos en árbol (evita puertos 4000/4321 ocupados).
 *   - Logs coloreados con prefijo por servicio ([BACKEND] / [FRONTEND]).
 *   - Sin advertencias DEP0190 en Node 24.
 */

import { spawn, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

// Paleta de colores ANSI
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

console.clear?.();
console.log(`
${c.cyan}${c.bold}====================================================================${c.reset}
  🏥 ${c.bold}MEDPULSE - SISTEMA INTELIGENTE DE GESTIÓN DE CITAS CLÍNICAS${c.reset}
${c.cyan}${c.bold}====================================================================${c.reset}
  ${c.green}✔ Modo:${c.reset} Desarrollo Completo (Full-Stack)
  ${c.green}✔ Plataforma:${c.reset} ${process.platform} (Node ${process.version})
  ${c.green}✔ Backend:${c.reset}  http://localhost:4000  ${c.dim}(Express / API REST)${c.reset}
  ${c.green}✔ Frontend:${c.reset} http://localhost:4321 ${c.dim}(Astro / UI)${c.reset}
${c.dim}--------------------------------------------------------------------${c.reset}
  Presiona ${c.bold}Ctrl + C${c.reset} en cualquier momento para detener todos los servidores.
${c.cyan}${c.bold}====================================================================${c.reset}
`);

// Validar directorios
const backendDir = path.join(__dirname, 'backend');
const frontendDir = path.join(__dirname, 'frontend', 'MedPulse_Astro', 'medpulse-astro');

if (!fs.existsSync(backendDir)) {
  console.error(`${c.red}❌ Error: No se encontró el directorio del backend en: ${backendDir}${c.reset}`);
  process.exit(1);
}

if (!fs.existsSync(frontendDir)) {
  console.error(`${c.red}❌ Error: No se encontró el directorio del frontend en: ${frontendDir}${c.reset}`);
  process.exit(1);
}

// Asegurar que backend/.env existe
const backendEnv = path.join(backendDir, '.env');
const backendEnvExample = path.join(backendDir, '.env.example');
if (!fs.existsSync(backendEnv) && fs.existsSync(backendEnvExample)) {
  console.log(`${c.yellow}⚠️ Creando backend/.env a partir de .env.example...${c.reset}`);
  fs.copyFileSync(backendEnvExample, backendEnv);
}

const processes = [];

function pipeOutput(stream, prefix, color) {
  if (!stream) return;
  let buffer = '';
  stream.on('data', (data) => {
    buffer += data.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Mantener remanente
    for (const line of lines) {
      if (line.trim().length > 0) {
        console.log(`${color}${prefix}${c.reset} ${line}`);
      }
    }
  });
}

function spawnCommand(cwd, args, envExtra = {}) {
  if (isWindows) {
    return spawn('cmd.exe', ['/c', npmCmd, ...args], {
      cwd,
      env: { ...process.env, ...envExtra },
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
    });
  }
  return spawn(npmCmd, args, {
    cwd,
    env: { ...process.env, ...envExtra },
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: false,
  });
}

function startBackend() {
  console.log(`${c.cyan}[MEDPULSE]${c.reset} Iniciando servicio Backend en :4000...`);
  const child = spawnCommand(backendDir, ['run', 'dev'], { PORT: '4000' });

  pipeOutput(child.stdout, '[BACKEND:4000]', c.cyan);
  pipeOutput(child.stderr, '[BACKEND:ERR ]', c.red);

  child.on('error', (err) => {
    console.error(`${c.red}❌ Error en Backend:${c.reset}`, err.message);
  });

  processes.push({ name: 'Backend', proc: child });
}

function startFrontend() {
  console.log(`${c.magenta}[MEDPULSE]${c.reset} Iniciando servicio Frontend en :4321...`);
  const child = spawnCommand(frontendDir, ['run', 'dev']);

  pipeOutput(child.stdout, '[FRONTEND:4321]', c.magenta);
  pipeOutput(child.stderr, '[FRONTEND:ERR ]', c.yellow);

  child.on('error', (err) => {
    console.error(`${c.red}❌ Error en Frontend:${c.reset}`, err.message);
  });

  processes.push({ name: 'Frontend', proc: child });
}

let isTerminating = false;
function terminateAll() {
  if (isTerminating) return;
  isTerminating = true;

  console.log(`\n${c.yellow}🛑 Deteniendo servicios de MedPulse (Backend y Frontend)...${c.reset}`);

  for (const { name, proc } of processes) {
    if (proc && proc.pid) {
      try {
        if (isWindows) {
          execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
        } else {
          proc.kill('SIGINT');
        }
        console.log(`${c.green}✔ ${name} detenido correctamente.${c.reset}`);
      } catch {
        // Ignorar si el proceso ya terminó
      }
    }
  }

  console.log(`${c.cyan}👋 Todo el proyecto ha sido detenido.${c.reset}\n`);
  process.exit(0);
}

process.on('SIGINT', terminateAll);
process.on('SIGTERM', terminateAll);
process.on('SIGHUP', terminateAll);

// Iniciar ambos servicios
startBackend();
startFrontend();
