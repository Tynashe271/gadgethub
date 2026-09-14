module.exports = {
  apps: [{
    name: 'gadgethub-api',
    script: './dist/src/server.js',
    instances: 'max', // Or a specific number like 4
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    time: true,
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000,
  }],
};