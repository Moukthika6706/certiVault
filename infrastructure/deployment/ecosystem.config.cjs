// PM2 process definition for the CertiVault API.
//   pm2 start infrastructure/deployment/ecosystem.config.cjs
//   pm2 status | pm2 logs certivault-api | pm2 restart certivault-api
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'certivault-api',
      cwd: path.resolve(__dirname, '..', '..', 'backend'), // backend/.env is loaded from here
      script: 'dist/src/server.js',
      exec_mode: 'fork',
      instances: 1, // SQLite: a single process keeps writes simple
      max_memory_restart: '300M',
      time: true, // timestamp log lines
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
