const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const { Resend } = require('resend');
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

let transporter;
try {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });
} catch (e) {
  console.log("Email transporter not initialized (SMTP config missing or invalid).");
}

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const identifier = (username || '').trim();

    // Default admin fallback if not yet in database
    if ((identifier === 'admin' || identifier.toLowerCase() === 'admin@sarisari.com') && password === 'admin123') {
      const adminExists = await User.findOne({ 
        $or: [{ username: 'admin' }, { email: 'admin@sarisari.com' }] 
      });
      if (!adminExists) {
        return res.json({ success: true, username: 'admin', role: 'Administrator' });
      }
    }

    // Lookup user by either username or email (case-insensitive for email/username)
    const user = await User.findOne({
      $or: [
        { username: { $regex: new RegExp(`^${identifier}$`, 'i') } },
        { email: identifier.toLowerCase() }
      ]
    });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    res.json({ success: true, username: user.username, role: user.role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Forgot Password - Restricted strictly to Email
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Lookup user strictly by email
    const user = await User.findOne({ email: cleanEmail });
    
    if (!user) {
      return res.status(404).json({ message: 'No account associated with this email address' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP and expiry (15 mins)
    user.resetPasswordOtp = otp;
    user.otpExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    console.log(`\n\n--- OTP for ${cleanEmail}: ${otp} ---\n\n`);

    const emailSubject = 'Password Reset OTP - Sari-Sari Store';
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px;">
        <h2 style="color: #2563eb; margin-top: 0;">Password Reset Request</h2>
        <p>You requested an OTP to reset your password. Use the verification code below:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; font-size: 26px; font-weight: bold; letter-spacing: 6px; text-align: center; color: #1f2937; margin: 20px 0;">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #6b7280; margin-bottom: 0;">This code will expire in 15 minutes. If you did not make this request, you can safely ignore this email.</p>
      </div>
    `;

    // 1. Try Resend HTTP API (Port 443 - Never blocked on Render/Cloud)
    if (resendClient) {
      try {
        const { error } = await resendClient.emails.send({
          from: 'Sari-Sari Store <onboarding@resend.dev>',
          to: user.email,
          subject: emailSubject,
          html: emailHtml,
        });

        if (error) {
          console.error("Resend API error:", error);
          throw new Error(error.message || 'Resend API failed');
        }

        console.log(`OTP successfully sent via Resend to ${user.email}`);
        return res.json({ message: 'OTP sent successfully to your email!', email: user.email });
      } catch (resendErr) {
        console.error("Resend delivery failed, attempting SMTP fallback if configured:", resendErr.message);
      }
    }

    // 2. Fallback to Gmail SMTP
    if (transporter && process.env.SMTP_USER) {
      try {
        const sendPromise = transporter.sendMail({
          from: `"Sari-Sari Store" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: emailSubject,
          html: emailHtml,
          text: `Your OTP for password reset is: ${otp}. It will expire in 15 minutes.`,
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('SMTP connection timed out')), 6000)
        );

        await Promise.race([sendPromise, timeoutPromise]);
        console.log(`OTP successfully delivered to ${user.email} via SMTP`);
        return res.json({ message: 'OTP sent successfully to your email!', email: user.email });
      } catch (emailErr) {
        console.error("SMTP error:", emailErr.message);
        return res.status(500).json({ 
          message: `Email sending timed out or failed (${emailErr.message}). On Render, add RESEND_API_KEY in Environment settings to send emails reliably over HTTPS.` 
        });
      }
    }

    return res.status(500).json({
      message: 'No email service configured. Please add RESEND_API_KEY in your Render dashboard.'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user || user.resetPasswordOtp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    res.json({ success: true, message: 'OTP verified' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user || user.resetPasswordOtp !== otp || Date.now() > user.otpExpiry) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordOtp = null;
    user.otpExpiry = null;
    
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
