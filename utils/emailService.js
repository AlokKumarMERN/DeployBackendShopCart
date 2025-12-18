import nodemailer from 'nodemailer';

// Create transporter based on environment
const createTransporter = () => {
  // For production, use a real email service (Gmail, SendGrid, etc.)
  if (process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  }
  
  // For development, use Ethereal (test email service)
  // This won't actually send emails but generates preview URLs
  console.log('⚠️  Email service not configured. Using development mode.');
  console.log('💡 Add EMAIL_SERVICE, EMAIL_USER, and EMAIL_PASSWORD to .env for production');
  return null;
};

const transporter = createTransporter();

export const sendPasswordResetEmail = async (email, resetUrl) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@alokgeneralstore.com',
    to: email,
    subject: 'Password Reset Request - Alok General Store',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You are receiving this email because you (or someone else) has requested to reset your password.</p>
        <p>Please click on the following link, or paste it into your browser to complete the process:</p>
        <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; margin: 20px 0; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>If the button doesn't work, copy and paste this link:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">Alok General Store</p>
      </div>
    `,
    text: `
      Password Reset Request
      
      You are receiving this email because you (or someone else) has requested to reset your password.
      
      Please visit the following link to complete the process:
      ${resetUrl}
      
      This link will expire in 1 hour.
      
      If you did not request this, please ignore this email and your password will remain unchanged.
    `,
  };

  try {
    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } else {
      // In development mode without email config, just log the reset URL
      console.log('📧 Password Reset URL (dev mode):', resetUrl);
      console.log('💡 Configure email service to send actual emails');
      return { success: true, devMode: true, resetUrl };
    }
  } catch (error) {
    console.error('❌ Email send error:', error);
    throw new Error('Failed to send password reset email');
  }
};

export const sendPasswordResetConfirmation = async (email) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@alokgeneralstore.com',
    to: email,
    subject: 'Password Reset Successful - Alok General Store',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Successful</h2>
        <p>Your password has been successfully changed.</p>
        <p>If you did not make this change, please contact us immediately.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        <p style="color: #999; font-size: 12px;">Alok General Store</p>
      </div>
    `,
    text: `
      Password Reset Successful
      
      Your password has been successfully changed.
      
      If you did not make this change, please contact us immediately.
    `,
  };

  try {
    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Confirmation email sent:', info.messageId);
      return { success: true };
    } else {
      console.log('✅ Password reset confirmed (dev mode)');
      return { success: true, devMode: true };
    }
  } catch (error) {
    console.error('❌ Email send error:', error);
    // Don't throw error for confirmation emails, just log it
    return { success: false };
  }
};
