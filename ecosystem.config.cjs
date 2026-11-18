module.exports = {
  apps: [
    {
      name: 'visit-studio',
      script: './server/index.js',
      node_args: '--experimental-sqlite',
      instances: 1, // Single instance to preserve SQLite WAL in-memory locking
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-err.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true
    }
  ]
};
