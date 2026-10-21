const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

let transporter;
try {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
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

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const identifier = (email || '').trim();
    
    // Allow lookup by username or email
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${identifier}$`, 'i') } }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User with this username or email not found' });
    }

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP and expiry
    user.resetPasswordOtp = otp;
    user.otpExpiry = Date.now() + 15 * 60 * 1000;
    await user.save();

    console.log(`\n\n--- OTP for ${email}: ${otp} ---\n\n`);

    if (transporter && process.env.SMTP_USER) {
      try {
        await transporter.sendMail({
          from: '"Sari-Sari Inventory" <noreply@sarisari.com>',
          to: user.email,
          subject: 'Password Reset OTP',
          text: `Your OTP for password reset is: ${otp}. It will expire in 15 minutes.`,
        });
        console.log(`OTP sent via email to ${user.email}`);
      } catch (emailErr) {
        console.error("Failed to send email, but OTP was generated:", emailErr);
      }
    }

    res.json({ message: 'OTP sent successfully (Check console if email fails)', email: user.email });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    const identifier = (email || '').trim();
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${identifier}$`, 'i') } }
      ]
    });

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
    const identifier = (email || '').trim();
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${identifier}$`, 'i') } }
      ]
    });

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
