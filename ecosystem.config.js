// PM2 process manager config for MathStudy.in (production VPS).
//   Start:    pm2 start ecosystem.config.js --env production
//   Reload:   pm2 reload ecosystem.config.js --env production   (zero-downtime)
//   Save:     pm2 save        (persist process list across reboots)
//   Startup:  pm2 startup      (generate the boot service, run the printed cmd)
//
// Real secrets live in the server's .env file (never committed). PM2 loads them
// because server.js calls require('dotenv').config() at startup, so we only set
// non-secret runtime defaults here.
module.exports = {
  apps: [
    {
      name: 'mathstudy',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,            // single instance: express-session uses in-memory store
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'development'
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      // Logs (rotate with: pm2 install pm2-logrotate)
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      time: true
    }
  ]
};
