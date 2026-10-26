export const logger = {
  info: (message, meta) => {
    console.log(JSON.stringify({ level: 'info', message, ...(meta ? { meta } : {}) }));
  },
  warn: (message, meta) => {
    console.warn(JSON.stringify({ level: 'warn', message, ...(meta ? { meta } : {}) }));
  },
  error: (message, meta) => {
    console.error(JSON.stringify({ level: 'error', message, ...(meta ? { meta } : {}) }));
  },
  debug: (message, meta) => {
    if (process.env.DEBUG) {
      console.debug(JSON.stringify({ level: 'debug', message, ...(meta ? { meta } : {}) }));
    }
  },
};
