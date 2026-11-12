import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || 'medpulse-dev-hmac-secret-2026',
  authStrict: process.env.AUTH_STRICT === 'true',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/medpulse_db',
  googleCalendar: {
    clientId: process.env.GOOGLE_CLIENT_ID || 'mock-google-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'mock-google-client-secret',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/calendar/callback'
  }
};
