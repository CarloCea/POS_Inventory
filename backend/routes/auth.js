const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

let transporter;
try {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    pool: true,
    maxConnections: 3,
    socketTimeout: 10000,
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

    // Asynchronously dispatch email without blocking the HTTP response (instant UI response)
    if (transporter && process.env.SMTP_USER) {
      transporter.sendMail({
        from: `"Sari-Sari Store" <${process.env.SMTP_USER}>`,
        to: user.email,
        subject: 'Password Reset OTP - Sari-Sari Store',
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>You requested an OTP to reset your password. Use the code below:</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; font-size: 24px; font-weight: bold; letter-spacing: 5px; text-align: center; color: #1f2937; margin: 20px 0;">
              ${otp}
            </div>
            <p style="font-size: 13px; color: #6b7280;">This code is valid for 15 minutes. If you did not request this, please ignore this email.</p>
          </div>
        `,
        text: `Your OTP for password reset is: ${otp}. It will expire in 15 minutes.`,
      }).catch(emailErr => {
        console.error("Failed to deliver reset email in background:", emailErr);
      });
    }

    // Respond immediately to the frontend
    res.json({ message: 'OTP sent successfully to your email!', email: user.email });
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
