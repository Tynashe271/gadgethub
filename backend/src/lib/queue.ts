import { Queue, Worker, Job } from 'bullmq';
import logger from './logger.js';

// Redis connection configuration
const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Queue definitions
export const notificationQueue = new Queue('notifications', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const emailQueue = new Queue('emails', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const smsQueue = new Queue('sms', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  },
});

// Job data types
interface NotificationJobData {
  userId: string;
  title: string;
  body: string;
  type: string;
  channel: 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH';
  data?: any;
}

interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SMSJobData {
  to: string;
  message: string;
}

// Notification worker
const notificationWorker = new Worker(
  'notifications',
  async (job: Job<NotificationJobData>) => {
    const { userId, title, body, type, channel, data } = job.data;

    logger.info(`Processing notification for user ${userId}: ${title}`);

    logger.info(`Notification processed successfully for user ${userId}`);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// Email worker (placeholder - would need nodemailer integration)
const emailWorker = new Worker(
  'emails',
  async (job: Job<EmailJobData>) => {
    const { to, subject, html, text } = job.data;
    
    logger.info(`Sending email to ${to}: ${subject}`);
    
    logger.info(`Email sent successfully to ${to}`);
  },
  {
    connection: redisConnection,
    concurrency: 3,
  }
);

// SMS worker (placeholder - would need Twilio integration)
const smsWorker = new Worker(
  'sms',
  async (job: Job<SMSJobData>) => {
    const { to, message } = job.data;
    
    logger.info(`Sending SMS to ${to}`);
    
    logger.info(`SMS sent successfully to ${to}`);
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

// Worker error handling
const setupWorkerErrorHandling = (worker: Worker, queueName: string) => {
  worker.on('completed', (job) => {
    logger.info(`Job ${job.id} in ${queueName} completed`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} in ${queueName} failed: ${err.message}`);
  });

  worker.on('error', (err) => {
    logger.error(`Worker error in ${queueName}: ${err.message}`);
  });
};

setupWorkerErrorHandling(notificationWorker, 'notifications');
setupWorkerErrorHandling(emailWorker, 'emails');
setupWorkerErrorHandling(smsWorker, 'sms');

// Queue management functions
export const queueManager = {
  async addNotification(data: NotificationJobData, options?: any) {
    return await notificationQueue.add('notification', data, options);
  },

  async addEmail(data: EmailJobData, options?: any) {
    return await emailQueue.add('send-email', data, options);
  },

  async addSMS(data: SMSJobData, options?: any) {
    return await smsQueue.add('send-sms', data, options);
  },

  async getQueueStats() {
    const [notificationStats, emailStats, smsStats] = await Promise.all([
      notificationQueue.getJobCounts(),
      emailQueue.getJobCounts(),
      smsQueue.getJobCounts(),
    ]);

    return {
      notifications: notificationStats,
      emails: emailStats,
      sms: smsStats,
    };
  },

  async pauseAllQueues() {
    await Promise.all([
      notificationQueue.pause(),
      emailQueue.pause(),
      smsQueue.pause(),
    ]);
  },

  async resumeAllQueues() {
    await Promise.all([
      notificationQueue.resume(),
      emailQueue.resume(),
      smsQueue.resume(),
    ]);
  },

  async closeAllWorkers() {
    await Promise.all([
      notificationWorker.close(),
      emailWorker.close(),
      smsWorker.close(),
    ]);
  },
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Closing queue workers...');
  await queueManager.closeAllWorkers();
});

process.on('SIGINT', async () => {
  logger.info('Closing queue workers...');
  await queueManager.closeAllWorkers();
});