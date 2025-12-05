const express = require('express');
const crypto = require('crypto');
const { exec, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();

// Use raw body for signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

// Parse JSON for other routes
app.use(express.json());

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default_secret_for_testing';
const DEPLOYMENT_SCRIPT = process.env.DEPLOYMENT_SCRIPT || '/home/ubuntu/quickshop/deployment/deploy.sh';
const LOG_DIR = process.env.LOG_DIR || '/home/ubuntu/quickshop/logs';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Verify GitHub webhook signature
function verifySignature(payload, signature) {
    if (!signature) {
        return false;
    }

    const expectedSignature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');

    // Use timing-safe comparison
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

// Log function
function logMessage(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type}] ${message}\n`;
    console.log(logEntry.trim());

    // Write to log file
    const logFilePath = path.join(LOG_DIR, 'webhook.log');
    fs.appendFileSync(logFilePath, logEntry);
}

// Webhook endpoint
app.post('/webhook', (req, res) => {
    const signature = req.headers['x-hub-signature-256'];

    logMessage('Received webhook request');

    if (!signature) {
        logMessage('No signature provided', 'ERROR');
        return res.status(401).send('No signature provided');
    }

    if (!verifySignature(req.body, signature)) {
        logMessage('Invalid signature', 'ERROR');
        return res.status(401).send('Invalid signature');
    }

    // Parse the webhook payload
    const payload = JSON.parse(req.body);

    // Only deploy on push to main branch
    if (payload.ref !== 'refs/heads/main' && payload.ref !== 'refs/heads/master') {
        logMessage(`Skipping deployment for branch: ${payload.ref}`, 'INFO');
        return res.status(200).send('Skipping deployment - not main/master branch');
    }

    logMessage(`Processing webhook for branch: ${payload.ref}`, 'INFO');

    // Execute deployment script
    const deploymentProcess = spawn('bash', [DEPLOYMENT_SCRIPT], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    deploymentProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        logMessage(`Deployment output: ${data.toString().trim()}`, 'INFO');
    });

    deploymentProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        logMessage(`Deployment error: ${data.toString().trim()}`, 'ERROR');
    });

    deploymentProcess.on('close', (code) => {
        logMessage(`Deployment process exited with code: ${code}`, code === 0 ? 'INFO' : 'ERROR');

        if (code === 0) {
            res.status(200).send('Deployment triggered successfully');
        } else {
            res.status(500).send('Deployment failed');
        }
    });

    deploymentProcess.on('error', (error) => {
        logMessage(`Failed to start deployment: ${error.message}`, 'ERROR');
        res.status(500).send('Failed to start deployment process');
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Webhook Server'
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    res.status(200).json({
        status: 'RUNNING',
        webhook_secret_set: !!process.env.WEBHOOK_SECRET,
        deployment_script: DEPLOYMENT_SCRIPT,
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 9000;

app.listen(PORT, '0.0.0.0', () => {
    logMessage(`Webhook server running on port ${PORT}`, 'INFO');
    logMessage(`Webhook endpoint: http://0.0.0.0:${PORT}/webhook`, 'INFO');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logMessage('Received SIGTERM, shutting down gracefully', 'INFO');
    process.exit(0);
});

process.on('SIGINT', () => {
    logMessage('Received SIGINT, shutting down gracefully', 'INFO');
    process.exit(0);
});