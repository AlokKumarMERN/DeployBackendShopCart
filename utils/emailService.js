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
      // Optimize for faster delivery
      pool: true, // Use pooled connections
      maxConnections: 5, // Allow multiple concurrent connections
      maxMessages: 100, // Messages per connection before reconnecting
      rateDelta: 1000, // Rate limiting window (ms)
      rateLimit: 10, // Max emails per rateDelta
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

// @desc    Send coupon notification email to eligible user
export const sendCouponNotificationEmail = async (email, userName, couponData) => {
  const { code, discountType, discountValue, minOrderAmount, endDate, description } = couponData;
  const discountText = discountType === 'percentage' ? `${discountValue}%` : `₹${discountValue}`;
  const validTill = new Date(endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@alokgeneralstore.com',
    to: email,
    subject: `🎉 Exclusive Coupon Just For You - ${code} | Alok General Store`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px;">
        <div style="background: white; border-radius: 10px; padding: 30px;">
          <h1 style="color: #333; text-align: center; margin-bottom: 10px;">🎉 Special Offer!</h1>
          <p style="color: #666; text-align: center; font-size: 16px;">Hi ${userName || 'Valued Customer'},</p>
          <p style="color: #666; text-align: center; font-size: 16px;">We have an exclusive coupon just for you!</p>
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
            <p style="color: white; margin: 0 0 10px 0; font-size: 14px;">YOUR EXCLUSIVE COUPON CODE</p>
            <div style="background: white; display: inline-block; padding: 15px 30px; border-radius: 8px; border: 2px dashed #667eea;">
              <span style="font-family: monospace; font-size: 28px; font-weight: bold; color: #333; letter-spacing: 3px;">${code}</span>
            </div>
            <p style="color: white; margin: 15px 0 0 0; font-size: 20px; font-weight: bold;">Get ${discountText} OFF</p>
          </div>
          
          ${description ? `<p style="color: #666; text-align: center; font-style: italic;">"${description}"</p>` : ''}
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 20px 0;">
            <p style="margin: 5px 0; color: #666;"><strong>📅 Valid Till:</strong> ${validTill}</p>
            ${minOrderAmount > 0 ? `<p style="margin: 5px 0; color: #666;"><strong>🛒 Min. Order:</strong> ₹${minOrderAmount}</p>` : ''}
          </div>
          
          <div style="text-align: center; margin-top: 25px;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px; font-weight: bold; font-size: 16px;">Shop Now →</a>
          </div>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            You're receiving this because you're a valued customer of Alok General Store.<br>
            © ${new Date().getFullYear()} Alok General Store. All rights reserved.
          </p>
        </div>
      </div>
    `,
    text: `
      🎉 Special Offer Just For You!
      
      Hi ${userName || 'Valued Customer'},
      
      We have an exclusive coupon just for you!
      
      COUPON CODE: ${code}
      DISCOUNT: ${discountText} OFF
      Valid Till: ${validTill}
      ${minOrderAmount > 0 ? `Min. Order Amount: ₹${minOrderAmount}` : ''}
      ${description ? `\n${description}` : ''}
      
      Shop now at: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
      
      Thank you for being a valued customer!
      
      - Alok General Store
    `,
  };

  try {
    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Coupon email sent to:', email, 'MessageId:', info.messageId);
      return { success: true, messageId: info.messageId };
    } else {
      console.log('📧 Coupon Email (dev mode) to:', email, 'Code:', code);
      return { success: true, devMode: true };
    }
  } catch (error) {
    console.error('❌ Coupon email send error:', error);
    return { success: false, error: error.message };
  }
};

// @desc    Send bulk coupon email notifications
export const sendBulkCouponNotifications = async (users, couponData, options = {}) => {
  const { sendEmail = true } = options;
  
  console.log('📧 Starting bulk email notifications...');
  console.log(`   - Users to notify: ${users.length}`);
  console.log(`   - Send Email: ${sendEmail}`);
  
  const results = {
    emailsSent: 0,
    emailsFailed: 0,
  };

  // Process in batches to avoid overwhelming the server
  const batchSize = 10;
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);
    
    const promises = batch.map(async (user) => {
      console.log(`\n👤 Processing user: ${user.name} (${user.email})`);
      
      // Send Email
      if (sendEmail && user.email) {
        console.log(`   📧 Sending email to: ${user.email}`);
        const emailResult = await sendCouponNotificationEmail(user.email, user.name, couponData);
        if (emailResult.success) {
          console.log(`   ✅ Email sent successfully to ${user.email}`);
          results.emailsSent++;
        } else {
          console.log(`   ❌ Email failed for ${user.email}: ${emailResult.error || 'Unknown error'}`);
          results.emailsFailed++;
        }
      }
    });

    await Promise.all(promises);
    
    // Small delay between batches to prevent rate limiting
    if (i + batchSize < users.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  console.log('\n📊 ========== NOTIFICATION RESULTS ==========');
  console.log(`   ✅ Emails Sent: ${results.emailsSent}`);
  console.log(`   ❌ Emails Failed: ${results.emailsFailed}`);
  console.log('============================================\n');
  
  return results;
};

// @desc    Send order status update email (for Delivered/Cancelled)
export const sendOrderStatusEmail = async (email, userName, orderData) => {
  const { orderId, orderNumber, status, grandTotal, items, cancellationReason } = orderData;
  
  const isDelivered = status === 'Delivered';
  const isCancelled = status === 'Cancelled';
  
  const statusEmoji = isDelivered ? '✅' : '❌';
  const statusColor = isDelivered ? '#10B981' : '#EF4444';
  const statusBgColor = isDelivered ? '#D1FAE5' : '#FEE2E2';
  
  const subject = isDelivered 
    ? `🎉 Your Order Has Been Delivered! - Order #${orderNumber}`
    : `❌ Order Cancelled - Order #${orderNumber}`;
  
  // Build items HTML
  const itemsHtml = items?.slice(0, 5).map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">×${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.subtotal || (item.price * item.quantity)}</td>
    </tr>
  `).join('') || '';
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@alokgeneralstore.com',
    to: email,
    subject: subject,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #333; margin: 0;">Alok General Store</h1>
        </div>
        
        <div style="background-color: ${statusBgColor}; border-radius: 10px; padding: 20px; text-align: center; margin-bottom: 20px;">
          <span style="font-size: 48px;">${statusEmoji}</span>
          <h2 style="color: ${statusColor}; margin: 10px 0;">
            ${isDelivered ? 'Order Delivered!' : 'Order Cancelled'}
          </h2>
          <p style="color: #666; margin: 0;">Order #${orderNumber}</p>
        </div>
        
        <p style="color: #333;">Dear ${userName || 'Valued Customer'},</p>
        
        ${isDelivered ? `
          <p style="color: #333;">Great news! Your order has been successfully delivered. We hope you enjoy your purchase!</p>
          <p style="color: #333;">If you have any concerns about your order, please contact us within 7 days for replacement/refund.</p>
        ` : `
          <p style="color: #333;">We're sorry to inform you that your order has been cancelled.</p>
          ${cancellationReason ? `
            <div style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 15px; margin: 15px 0;">
              <p style="margin: 0; color: #DC2626;"><strong>Reason for Cancellation:</strong></p>
              <p style="margin: 5px 0 0 0; color: #7F1D1D;">${cancellationReason}</p>
            </div>
          ` : ''}
          <p style="color: #333;">If you have any questions, please contact our customer support.</p>
        `}
        
        <div style="background-color: #F9FAFB; border-radius: 10px; padding: 20px; margin: 20px 0;">
          <h3 style="margin: 0 0 15px 0; color: #333;">Order Summary</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #E5E7EB;">
                <th style="padding: 10px; text-align: left;">Item</th>
                <th style="padding: 10px; text-align: center;">Qty</th>
                <th style="padding: 10px; text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; color: ${statusColor};">₹${grandTotal}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        
        ${isCancelled ? `
          <p style="color: #666; font-size: 14px;">If payment was already made, the refund will be processed within 5-7 business days.</p>
        ` : `
          <p style="color: #666; font-size: 14px;">Thank you for shopping with us! We appreciate your business.</p>
        `}
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
        
        <div style="text-align: center; color: #999; font-size: 12px;">
          <p>Alok General Store</p>
          <p>If you have any questions, please contact us at ${process.env.EMAIL_FROM || 'support@alokgeneralstore.com'}</p>
        </div>
      </div>
    `,
  };

  try {
    if (transporter) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ Order ${status} email sent to ${email}:`, info.messageId);
      return { success: true, messageId: info.messageId };
    } else {
      console.log(`📧 Order ${status} email (dev mode) - Would send to: ${email}`);
      return { success: true, devMode: true };
    }
  } catch (error) {
    console.error('❌ Order status email send error:', error);
    return { success: false, error: error.message };
  }
};

