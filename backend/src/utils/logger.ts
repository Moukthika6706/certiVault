type Level = 'info' | 'warn' | 'error';

function log(level: Level, message: string, extra?: unknown) {
  const line = `[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)} ${message}`;
  const out = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  if (extra !== undefined) out(line, extra);
  else out(line);
}

export const logger = {
  info: (m: string, e?: unknown) => log('info', m, e),
  warn: (m: string, e?: unknown) => log('warn', m, e),
  error: (m: string, e?: unknown) => log('error', m, e),
};
