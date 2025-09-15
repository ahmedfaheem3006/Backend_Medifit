const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { Resend } = require('resend');

require("dotenv").config();

// إنشاء instance من Resend
const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/request-password-reset", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.verificationCode = verificationCode;
    user.verificationCodeExpires = Date.now() + 10 * 60 * 1000;
    await user.save();

    // إرسال البريد باستخدام Resend
    const { data, error } = await resend.emails.send({
      from: 'MediFit <onboarding@resend.dev>', // استخدم هذا للتجربة
      to: [user.email],
      subject: 'Password Reset Code',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Your verification code is:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px;">
            ${verificationCode}
          </div>
          <p>This code will expire in 10 minutes.</p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ message: "Failed to send email" });
    }

    res.status(200).json({ 
      message: "Verification code sent successfully",
      email: user.email 
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to process request" });
  }
});

router.post("/verify-code", async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: "Email and code are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.verificationCodeExpires && user.verificationCodeExpires < Date.now()) {
      return res.status(400).json({ message: "Verification code has expired" });
    }

    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    res.status(200).json({ message: "Code verified successfully" });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error verifying code" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.verificationCode = undefined;
    user.verificationCodeExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password has been reset successfully!" });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
});

module.exports = router;