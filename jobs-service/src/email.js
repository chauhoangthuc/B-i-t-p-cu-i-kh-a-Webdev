import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || 'placeholder@gmail.com',
    pass: process.env.SMTP_PASS || 'placeholderpass'
  }
});

/**
 * Gửi email mời thành viên vào chuyến đi
 */
export async function sendTripInvitationEmail({ to, inviterName, tripName, inviteLink }) {
  const mailOptions = {
    from: `"TripManager" <${process.env.SMTP_USER || 'placeholder@gmail.com'}>`,
    to,
    subject: `Lời mời tham gia chuyến đi "${tripName}"`,
    text: `Xin chào,\n\nBạn đã được mời tham gia chuyến đi "${tripName}" bởi ${inviterName}.\nVui lòng nhấp vào liên kết sau để chấp nhận lời mời:\n${inviteLink}\n\nTrân trọng,\nTripManager Team`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #4F46E5;">Lời mời tham gia chuyến đi!</h2>
        <p>Xin chào,</p>
        <p>Bạn đã được mời tham gia chuyến đi <strong>"${tripName}"</strong> bởi thành viên <strong>${inviterName}</strong>.</p>
        <p>Vui lòng click vào nút bên dưới để chấp nhận lời mời và bắt đầu lên lịch trình cùng nhóm:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Chấp Nhận Lời Mời</a>
        </div>
        <hr style="border: 0; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #666;">Nếu nút trên không hoạt động, bạn có thể copy link sau và dán vào trình duyệt:<br/> ${inviteLink}</p>
      </div>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Invitation email sent to ${to}: Message ID: ${info.messageId}`);
    return info;
  } catch (err) {
    logger.error(`Failed to send invitation email to ${to}:`, err);
    throw err;
  }
}
