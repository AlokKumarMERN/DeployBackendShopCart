import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

// Load environment variables
dotenv.config();

console.log('Testing email configuration...\n');
console.log('EMAIL_SERVICE:', process.env.EMAIL_SERVICE);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '✅ SET' : '❌ NOT SET');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('\n---\n');

if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error('❌ Email configuration incomplete. Check your .env file.');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Test email
const mailOptions = {
  from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
  to: process.env.EMAIL_USER, // Send to yourself as a test
  subject: 'Test Email - Alok General Store',
  html: `
    <h2>Email Test Successful!</h2>
    <p>Your email configuration is working correctly.</p>
    <p>Time: ${new Date().toLocaleString()}</p>
  `,
  text: 'Email Test Successful! Your email configuration is working correctly.',
};

console.log('Sending test email...');

transporter.sendMail(mailOptions)
  .then((info) => {
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to send email:');
    console.error('Error:', error.message);
    if (error.code) console.error('Error Code:', error.code);
    if (error.command) console.error('Command:', error.command);
    process.exit(1);
  });
