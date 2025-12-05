module.exports = {
  apps: [
    {
      name: 'quickshop-backend',
      script: './backend/server.js',
      instances: 1, // For free tier, limit to 1 instance
      exec_mode: 'fork', // Use fork mode for simpler memory usage
      env: {
        NODE_ENV: 'production',
        PORT: 5000,
        HOST: '0.0.0.0'
      },
      env_file: './backend/.env',
      error_file: './backend/logs/err.log',
      out_file: './backend/logs/out.log',
      log_file: './backend/logs/combined.log',
      time: true,
      max_memory_restart: '512M',
      node_args: '--max-old-space-size=512',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      exp_backoff_restart_delay: 100,
      max_restarts: 30,
      min_uptime: '10s'
    },
    {
      name: 'quickshop-webhook',
      script: './webhook/webhook-server.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 9000,
        WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'your_strong_webhook_secret_here',
        DEPLOYMENT_SCRIPT: './deployment/deploy.sh',
        LOG_DIR: './logs'
      },
      error_file: './logs/webhook-err.log',
      out_file: './logs/webhook-out.log',
      log_file: './logs/webhook-combined.log',
      time: true,
      max_memory_restart: '256M',
      node_args: '--max-old-space-size=256',
      watch: false,
      ignore_watch: ['node_modules', 'logs', '.git'],
      exp_backoff_restart_delay: 100,
      max_restarts: 10,
      min_uptime: '10s'
    }
  ]
};