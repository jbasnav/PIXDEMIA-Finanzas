const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Iniciando Servidor Backend y Cliente Frontend...');

// Iniciar Backend Express
const server = spawn('node', ['server/server.js'], {
  stdio: 'inherit',
  shell: true
});

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Iniciar Cliente Vite
const client = spawn(npmCmd, ['--prefix', 'client', 'run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  server.kill();
  client.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
