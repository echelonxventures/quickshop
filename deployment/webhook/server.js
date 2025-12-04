const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 9000;

// GitHub webhook secret (should match the one in GitHub repository settings)
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'your_webhook_secret_here';

// Store for deployment logs
const DEPLOYMENT_LOG_FILE = '/tmp/deployment.log';

// Middleware to parse raw body for signature verification
app.use('/deploy', express.raw({ type: 'application/json' }));

// Function to verify GitHub webhook signature
const verifySignature = (req, signature, secret) => {
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(req.body)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  );
};

// Log deployment activities
const logDeployment = (message) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(DEPLOYMENT_LOG_FILE, logEntry);
};

// GitHub webhook handler
app.post('/deploy', (req, res) => {
  try {
    // Verify signature
    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      logDeployment('ERROR: No signature in request');
      return res.status(400).send('No signature provided');
    }

    if (!verifySignature(req, signature, process.env.WEBHOOK_SECRET || WEBHOOK_SECRET)) {
      logDeployment('ERROR: Invalid webhook signature');
      return res.status(403).send('Forbidden: Invalid signature');
    }

    // Verify event type is push
    const event = req.headers['x-github-event'];
    if (event !== 'push') {
      logDeployment(`INFO: Received ${event} event, ignoring`);
      return res.status(200).send('Event type not handled');
    }

    // Parse payload
    const payload = JSON.parse(req.body);
    
    // Check if it's the main branch
    if (payload.ref !== 'refs/heads/main' && payload.ref !== 'refs/heads/master') {
      logDeployment(`INFO: Received push for branch ${payload.ref}, ignoring (only handling main/master)`);
      return res.status(200).send('Branch not monitored');
    }

    logDeployment('INFO: Received push event for main branch, initiating deployment');

    // Execute deployment script
    const deployCommand = `
      cd /home/ubuntu/quickshop && \
      git pull origin main && \
      sudo docker-compose -f deployment/prod-docker-compose.yml down && \
      sudo docker-compose -f deployment/prod-docker-compose.yml up -d --build
    `;

    exec(deployCommand, (error, stdout, stderr) => {
      if (error) {
        logDeployment(`ERROR: Deployment failed - ${error.message}`);
        console.error(`Deployment error: ${error.message}`);
        return res.status(500).send('Deployment failed');
      }
      
      if (stderr) {
        logDeployment(`WARN: Deployment stderr - ${stderr}`);
        console.warn(`Deployment stderr: ${stderr}`);
      }
      
      logDeployment(`SUCCESS: Deployment completed - ${stdout.substring(0, 200)}...`);
      console.log(`Deployment output: ${stdout}`);
      res.status(200).send('Deployment started successfully');
    });
  } catch (error) {
    logDeployment(`ERROR: Exception in webhook handler - ${error.message}`);
    console.error('Error in webhook handler:', error);
    res.status(500).json({ error: 'Webhook processing error' });
  }
});

// Git auto-pull mechanism (runs every 5 minutes)
const setupAutoPull = () => {
  setInterval(() => {
    exec('cd /home/ubuntu/quickshop && git pull origin main', (error, stdout, stderr) => {
      if (error) {
        logDeployment(`AUTO-PULL ERROR: ${error.message}`);
        console.error('Auto-pull error:', error);
        return;
      }
      
      if (stdout.includes('Already up to date') || stdout.includes('Already up-to-date')) {
        logDeployment('AUTO-PULL: Repository already up to date');
      } else {
        logDeployment(`AUTO-PULL: Repository updated - ${stdout}`);
        console.log('Repository updated:', stdout);
        
        // If changes were pulled, restart services
        if (stdout.includes('Updating')) {
          exec('cd /home/ubuntu/quickshop && sudo docker-compose -f deployment/prod-docker-compose.yml restart', (restartErr) => {
            if (restartErr) {
              logDeployment(`AUTO-RESTART ERROR: ${restartErr.message}`);
              console.error('Auto-restart error:', restartErr);
            } else {
              logDeployment('AUTO-RESTART: Services restarted after auto-pull');
              console.log('Services restarted after auto-pull');
            }
          });
        }
      }
    });
  }, 5 * 60 * 1000); // Every 5 minutes
};

setupAutoPull();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Get deployment logs
app.get('/logs', (req, res) => {
  try {
    if (fs.existsSync(DEPLOYMENT_LOG_FILE)) {
      const logs = fs.readFileSync(DEPLOYMENT_LOG_FILE, 'utf8');
      res.status(200).json({ logs: logs.split('\n').filter(line => line.trim() !== '').slice(-50) });
    } else {
      res.status(200).json({ logs: [] });
    }
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Could not read logs' });
  }
});

// Manual deployment trigger (for testing)
app.post('/deploy-manual', (req, res) => {
  if (req.headers.authorization !== `Bearer ${process.env.MANUAL_DEPLOY_TOKEN}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  logDeployment('INFO: Manual deployment triggered');
  
  exec('cd /home/ubuntu/quickshop && sudo docker-compose -f deployment/prod-docker-compose.yml down && sudo docker-compose -f deployment/prod-docker-compose.yml up -d --build', (error, stdout, stderr) => {
    if (error) {
      logDeployment(`ERROR: Manual deployment failed - ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    
    if (stderr) {
      logDeployment(`WARN: Manual deployment stderr - ${stderr}`);
    }
    
    logDeployment(`SUCCESS: Manual deployment completed - ${stdout.substring(0, 200)}...`);
    res.status(200).json({ message: 'Manual deployment started', output: stdout });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Webhook server running on port ${PORT}`);
  console.log(`Webhook endpoint: http://localhost:${PORT}/deploy`);
  logDeployment(`INFO: Webhook server started on port ${PORT}`);
});

module.exports = app;