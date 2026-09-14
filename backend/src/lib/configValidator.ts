import { config } from '../config.js';

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'CORS_ORIGIN',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // JWT secret validation
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }

  // Database URL validation
  if (process.env.DATABASE_URL) {
    try {
      new URL(process.env.DATABASE_URL);
    } catch {
      errors.push('DATABASE_URL is not a valid URL');
    }
  }

  // Port validation
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }

  // Node environment validation
  const validEnvironments = ['development', 'production', 'test'];
  if (!validEnvironments.includes(config.NODE_ENV)) {
    warnings.push(`NODE_ENV should be one of: ${validEnvironments.join(', ')}`);
  }

  // JWT expiration validation
  if (config.JWT_EXPIRES_IN) {
    const validUnits = ['s', 'm', 'h', 'd', 'w', 'y'];
    const unit = config.JWT_EXPIRES_IN.slice(-1);
    if (!validUnits.includes(unit)) {
      warnings.push('JWT_EXPIRES_IN should use valid time units (s, m, h, d, w, y)');
    }
  }

  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    if (!process.env.REDIS_HOST) {
      warnings.push('REDIS_HOST is recommended for production');
    }
    if (!process.env.SMTP_HOST) {
      warnings.push('SMTP_HOST is recommended for production email functionality');
    }
    if (!process.env.PAYNOW_INTEGRATION_ID || !process.env.PAYNOW_INTEGRATION_KEY) {
      warnings.push('Paynow credentials are recommended for production payment processing');
    }
  }

  // Optional feature warnings
  if (!process.env.DEEPSEEK_API_KEY && !process.env.OPENAI_API_KEY) {
    warnings.push('No AI API key configured - AI assistant features will be limited');
  }

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    warnings.push('Twilio credentials not configured - SMS features will be limited');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

export function validateConfigOnStartup(): void {
  const validation = validateConfig();
  
  if (!validation.isValid) {
    console.error('❌ Configuration validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid configuration');
  }

  if (validation.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }

  console.log('✅ Configuration validation passed');
}
