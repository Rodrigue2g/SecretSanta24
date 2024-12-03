import fs from "node:fs/promises";
import path from "node:path";
import { toASCII } from "node:punycode";

import { createTransport } from "nodemailer";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import handlebars from "handlebars";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert an email from unicode to punycode
 * 
 * This only accep & converts emails with a hostname in punycode
 * 
 * @example 
 * - test@designø.com becomes test@xn--design-gya.com
 * - designø@gmail.com throws an INVALID_RECIPIENT error
 * 
 * @param {*} email - Valid Unicode email address
 * @returns Valid Punycode email address
 */
export function convertEmailToASCII(email) {
  const parts = email.split('@');
  if (parts.length !== 2) {
      console.log('Invalid email format:'+ `${parts} is not a valid email address`);
  }
  const localPart = parts[0];
  if (!isASCII(localPart)) {
    console.log(`Invalid email format: `+ `${email} contains invalid charchters!` +
                '\nOnly the hostname is allowed to have unicode charachters');
  }
  const domainPart = toASCII(parts[1]);
  return `${localPart}@${domainPart}`;
}

function isASCII(str) {
  return /^[\x00-\x7F]*$/.test(str);
}

export const SmtpTemplates = {
  SecretSanta: "email.handlebars",
  MessagingCode: "code.handlebars",
  EmailForTarget: "target.handlebars"
}

export const SmtpHost = {
  Sendgrid: "smtp.sendgrid.net",
  Mailgun: "smtp.mailgun.org",
  SocketLabs: "smtp.sockerlabs.com",
  Zohomail: "smtp.zoho.com",
  Gmail: "smtp.gmail.com",
  Office365: "smtp.office365.com"
}

export const smtpServiceFactory = (cfg) => {
  const smtp = createTransport(cfg);
  const isSmtpOn = Boolean(cfg.host);

  const sendMail = async ({ substitutions, recipients, template, subjectLine }) => {
    const html = await fs.readFile(path.resolve(__dirname, "../templates/", template), "utf8");
    const temp = handlebars.compile(html);
    const htmlToSend = temp(substitutions);

    if (isSmtpOn) {
      await smtp.sendMail({
        from: cfg.from,
        to: recipients.join(", "),
        subject: subjectLine,
        html: htmlToSend
      });
    } else {
    /*logger.info("SMTP is not configured. Outputting it in terminal");
      logger.info({
        from: cfg.from,
        to: recipients.join(", "),
        subject: subjectLine,
        html: htmlToSendq
      }); */
    }
  };

  return { sendMail };
};

export const formatSmtpConfig = () => {
  return {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    service: 'gmail',
    auth: process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD ? 
          { user: process.env.SMTP_USERNAME, pass: process.env.SMTP_PASSWORD } : undefined,
    secure: process.env.SMTP_PORT === 465,
    from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_ADDRESS}>`,
    ignoreTLS: process.env.SMTP_IGNORE_TLS,
    requireTLS: process.env.SMTP_REQUIRE_TLS,
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED
    },
    debug: process.env.DEBUG,
    // socketTimeout: 30000, // 30 seconds
    // connectionTimeout: 30000 
  }
};

export const smtp = smtpServiceFactory(formatSmtpConfig());