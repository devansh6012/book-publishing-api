export * from './audit.config';
export * from './logger.config';

// Application-wide configuration
export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiresIn: (process.env.JWT_EXPIRES_IN || '24h') as string,
  },
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },
};
