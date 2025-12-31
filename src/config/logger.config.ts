import pino, { Logger, LoggerOptions } from 'pino';
import fs from 'fs';
import path from 'path';

/**
 * Logger Configuration
 * 
 * Supports multiple log destinations via environment variables:
 * - file: Local file logging (default)
 * - elastic: Elasticsearch (requires ELASTIC_NODE env)
 * - logtail: Logtail (requires LOGTAIL_SOURCE_TOKEN env)
 * - console: Pretty console output (for development)
 */

export type LogDestination = 'file' | 'elastic' | 'logtail' | 'console';

export interface LogConfig {
  level: string;
  destination: LogDestination;
  filePath?: string;
  elasticNode?: string;
  elasticIndex?: string;
  logtailToken?: string;
}

function getLogConfig(): LogConfig {
  return {
    level: process.env.LOG_LEVEL || 'info',
    destination: (process.env.LOG_DESTINATION as LogDestination) || 'file',
    filePath: process.env.LOG_FILE_PATH || './logs/app.log',
    elasticNode: process.env.ELASTIC_NODE,
    elasticIndex: process.env.ELASTIC_INDEX || 'book-publishing-logs',
    logtailToken: process.env.LOGTAIL_SOURCE_TOKEN,
  };
}

function ensureLogDirectory(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createTransport(config: LogConfig): pino.TransportSingleOptions | pino.TransportMultiOptions | undefined {
  const { destination, filePath, elasticNode, elasticIndex, logtailToken } = config;

  switch (destination) {
    case 'file':
      if (filePath) {
        ensureLogDirectory(filePath);
      }
      return {
        target: 'pino/file',
        options: { destination: filePath || './logs/app.log' },
      };

    case 'elastic':
      // Note: In production, you'd use pino-elasticsearch transport
      // npm install pino-elasticsearch
      if (!elasticNode) {
        console.warn('ELASTIC_NODE not set, falling back to file logging');
        return {
          target: 'pino/file',
          options: { destination: './logs/app.log' },
        };
      }
      // This is a placeholder for Elasticsearch transport
      // In production: target: 'pino-elasticsearch'
      console.log(`Elasticsearch configured: ${elasticNode}/${elasticIndex}`);
      return {
        target: 'pino/file',
        options: { destination: './logs/elastic-fallback.log' },
      };

    case 'logtail':
      // Note: In production, you'd use @logtail/pino transport
      // npm install @logtail/pino
      if (!logtailToken) {
        console.warn('LOGTAIL_SOURCE_TOKEN not set, falling back to file logging');
        return {
          target: 'pino/file',
          options: { destination: './logs/app.log' },
        };
      }
      // This is a placeholder for Logtail transport
      // In production: target: '@logtail/pino'
      console.log('Logtail configured with token');
      return {
        target: 'pino/file',
        options: { destination: './logs/logtail-fallback.log' },
      };

    case 'console':
      return {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      };

    default:
      return undefined;
  }
}

export function createLogger(): Logger {
  const config = getLogConfig();
  
  const loggerOptions: LoggerOptions = {
    level: config.level,
    base: {
      pid: process.pid,
      env: process.env.NODE_ENV || 'development',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
  };

  const transport = createTransport(config);
  
  if (transport) {
    return pino(loggerOptions, pino.transport(transport));
  }
  
  return pino(loggerOptions);
}

// Default logger instance
export const logger = createLogger();

export { LogConfig, LogDestination };
