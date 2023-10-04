import nodemailer, { Transporter } from "nodemailer";
import path from "path";
import ejs from "ejs";

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { key: string | any };
}

const sendMail = async (options: EmailOptions): Promise<void> => {
  const transporter: Transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    service: process.env.SMTP_SERVICE,
    auth: {
      user: process.env.SMTP_MAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const { email, subject, template, data } = options;

  // get the path to the email template
  const templatePath = path.join(__dirname, "../mails", template);

  // Render the email tempalte with EJS
  const html: string = await ejs.renderFile(templatePath, data);

  // Send the email
  const mailOptions = {
    from: process.env.SMTP_MAIL,
    to: email,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

export default sendMail;
