import 'server-only';
import nodemailer from 'nodemailer';
import { serverEnv } from './env';

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

/** Transport « log » réservé au développement : il affiche le message (avec ses liens) dans la console. */
export async function sendMail(mail: Mail): Promise<void> {
  const env = serverEnv();
  if (env.MAIL_TRANSPORT === 'log') {
    if (env.APP_ENV === 'production') throw new Error('MAIL_TRANSPORT=log is forbidden in production');
    console.info(`[mail] to=${mail.to} subject=${mail.subject}\n${mail.text}`);
    return;
  }
  if (!env.SMTP_URL) throw new Error('SMTP_URL is required when MAIL_TRANSPORT=smtp');
  await nodemailer.createTransport(env.SMTP_URL).sendMail({ from: env.MAIL_FROM, ...mail });
}
