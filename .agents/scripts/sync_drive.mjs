import fs from 'fs';
import path from 'path';

const sourceFile = path.resolve('docs/MEDPULSE_NOTEBOOKLM_PLAN_V2.md');
const driveFolder = 'G:/Mi unidad/MedPulse';
const targetFile = path.join(driveFolder, 'MEDPULSE_NOTEBOOKLM_PLAN_V2.md');

console.log('=== Sincronizador Automático MedPulse -> Google Drive ===');

if (!fs.existsSync(sourceFile)) {
  console.error('[X] No se encontró el archivo origen:', sourceFile);
  process.exit(1);
}

if (!fs.existsSync(driveFolder)) {
  fs.mkdirSync(driveFolder, { recursive: true });
}

fs.copyFileSync(sourceFile, targetFile);
const stat = fs.statSync(targetFile);

console.log('[✓] Archivo sincronizado con éxito a Google Drive:');
console.log(`    Ruta: ${targetFile}`);
console.log(`    Tamaño: ${stat.size} bytes`);
console.log(`    Última modificación: ${stat.mtime.toLocaleString()}`);
console.log('[✓] Google Drive para escritorio está subiendo el cambio a la nube en tiempo real.');
