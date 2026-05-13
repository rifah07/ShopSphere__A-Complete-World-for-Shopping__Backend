import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: Number(process.env.MAIL_PORT) === 465, // true for 465, false for 587
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const emailManager = async (
  to: string,
  subject: string,
  text: string,
  html: string,
) => {
  await transport.sendMail({
    from: `"Your Shop" <${process.env.MAIL_USER}>`, // named sender looks more professional
    to,
    subject,
    text,
    html,
  });
};

export default emailManager;
