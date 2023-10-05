import nodemailer, { Transporter } from "nodemailer";
import path from "path";
import ejs from "ejs";
import dotenv from "dotenv";

dotenv.config();

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
}

const createTransporter = (): Transporter => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587"),
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
    // Set rejectUnauthorized to false to accept self-signed certificates
    tls: {
      rejectUnauthorized: false,
    },
  });
};

const renderEmailTemplate = async (
  template: string,
  data: any
): Promise<string> => {
  const templatePath = path.join(__dirname, "../mails", template);
  return ejs.renderFile(templatePath, data);
};

const sendMail = async (options: EmailOptions): Promise<void> => {
  const transporter = createTransporter();
  const { email, subject, template, data } = options;

  try {
    const html = await renderEmailTemplate(template, data);

    const mailOptions = {
      from: process.env.SMTP_MAIL,
      to: email,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export default sendMail;
