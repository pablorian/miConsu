const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3001; // Port used by Next.js
const ENV_FILE = path.join(__dirname, '../.env.local');

let tunnel;
let nextDev;
let isShuttingDown = false;

function startTunnel() {
  if (isShuttingDown) return;

  console.log('☁️ Starting Cloudflare Tunnel...');
  
  // Using 'cloudflared' directly as it is installed
  tunnel = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`], {
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Cloudflare logs URL to stderr usually
  tunnel.stderr.on('data', (data) => {
    const output = data.toString();
    const match = output.match(/(https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com)/);
    if (match) {
      const tunnelUrl = match[1];
      console.log(`✅ Tunnel URL: ${tunnelUrl}`);
      updateEnvAndRestartDev(tunnelUrl);
    }
  });

  tunnel.on('close', (code) => {
    if (!isShuttingDown) {
      console.log(`⚠️ Tunnel exited with code ${code}. Restarting in 3 seconds...`);
      setTimeout(startTunnel, 3000);
    }
  });

  tunnel.on('error', (err) => {
    console.error(`Tunnel Error: ${err}`);
  });
}

function updateEnvAndRestartDev(url) {
  // Update .env.local
  let envContent = '';
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf8');
  }

  const key = 'NEXT_PUBLIC_APP_URL';
  const newLine = `${key}=${url}`;

  if (envContent.includes(key)) {
    envContent = envContent.replace(new RegExp(`${key}=.*`), newLine);
  } else {
    envContent += `\n${newLine}`;
  }

  fs.writeFileSync(ENV_FILE, envContent);
  console.log('📝 Updated .env.local with new URL');

  // Restart Next.js if running
  if (nextDev) {
    console.log('🔄 Restarting Next.js Dev Server to pick up new URL...');
    nextDev.kill();
  } else {
    startNextDev();
  }
}

function startNextDev() {
  if (isShuttingDown) return;

  console.log('✨ Starting Next.js Dev Server...');
  nextDev = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
    shell: true,
    env: { ...process.env }
  });

  nextDev.on('close', (code) => {
    if (code !== 0 && !isShuttingDown) {
        console.log(`Next.js process exited with code ${code}.`);
    }
  });
}

// Start everything
startTunnel();

// Handle cleanup
process.on('SIGINT', () => {
  isShuttingDown = true;
  console.log('\n🛑 Stopping...');
  if (tunnel) tunnel.kill();
  if (nextDev) nextDev.kill();
  process.exit();
});
