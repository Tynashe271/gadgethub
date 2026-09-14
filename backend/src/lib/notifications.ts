import { NotificationChannel } from '@prisma/client';
import { AppError } from './http.js';
import { prisma } from './prisma.js';
import { sendEmail, sendPush, sendSms, sendWhatsapp } from './providers.js';

type NotificationRecipient = {
  id: string;
  email: string;
  phone: string | null;
};

export async function deliverNotification(
  user: NotificationRecipient,
  channel: NotificationChannel,
  subject: string,
  body: string,
  type = 'DIRECT',
) {
  switch (channel) {
    case NotificationChannel.EMAIL:
      return sendEmail(user.email, subject, body);
    case NotificationChannel.SMS:
      if (!user.phone) throw new AppError(422, 'User does not have a phone number');
      return sendSms(user.phone, body);
    case NotificationChannel.WHATSAPP:
      if (!user.phone) throw new AppError(422, 'User does not have a phone number');
      return sendWhatsapp(user.phone, body);
    case NotificationChannel.PUSH:
      return sendPush(user.id, { title: subject, body });
    case NotificationChannel.IN_APP:
      return prisma.notification.create({
        data: { userId: user.id, title: subject, body, type, channel },
      });
  }
}
