import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const venvPythonUnix = path.join(rootDir, 'services', 'ml', 'venv', 'bin', 'python');
const venvPythonWin = path.join(rootDir, 'services', 'ml', 'venv', 'Scripts', 'python.exe');
const appScript = path.join(rootDir, 'services', 'ml', 'app.py');

let pythonCmd = 'python3';
if (fs.existsSync(venvPythonUnix)) {
  pythonCmd = venvPythonUnix;
} else if (fs.existsSync(venvPythonWin)) {
  pythonCmd = venvPythonWin;
}

console.log(`[ML Runner] Executing ML Service with: ${pythonCmd}`);

const child = spawn(pythonCmd, [appScript], {
  stdio: 'inherit',
  cwd: path.join(rootDir, 'services', 'ml'),
  env: process.env,
});

child.on('error', (err) => {
  console.error('[ML Runner] Failed to start ML microservice:', err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (code !== 0 && code !== null) {
    console.error(`[ML Runner] Process exited with code ${code}`);
    process.exit(code);
  }
});
