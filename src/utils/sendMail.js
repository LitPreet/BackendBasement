import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
    host: "smtp.hostinger.com",
    secure: true,
  auth: {
    user: 'myvizlogic@vizlogicindia.com',
    pass: 'P@ss1234k',
  },
});

export const sendMail = async (data) => {
  const { email, subject, text } = data;
  console.log(email,'imsid')
  try {
    const mailOptions = {
      from: 'myvizlogic@vizlogicindia.com',
      to: email,
      subject: subject,
      text: text,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.log("Error occurred:", error);
  }
};

