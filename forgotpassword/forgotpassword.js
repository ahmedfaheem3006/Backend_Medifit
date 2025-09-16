const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const nodemailer = require('nodemailer'); // استيراد مباشر

require("dotenv").config();

// إنشاء transporter مباشرة
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'ahmedfaheem3006@gmail.com',
    pass: 'pktydrreixfwlup'
  },
  tls: {
    rejectUnauthorized: false
  }
});

// تحقق من الاتصال عند بدء التطبيق
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ SMTP connection failed:', error);
  } else {
    console.log('✅ SMTP server ready');
  }
});

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

    console.log(`Sending code ${verificationCode} to ${email}`);

    // إرسال الإيميل
    try {
      const mailOptions = {
        from: '"MediFit Support" <ahmedfaheem3006@gmail.com>',
        to: user.email,
        subject: 'Password Reset Code - MediFit',
        text: `Your password reset code is: ${verificationCode}\n\nThis code will expire in 10 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">MediFit</h1>
            </div>
            <div style="padding: 30px; background-color: #f5f5f5;">
              <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
              <p style="color: #666; font-size: 16px; text-align: center;">
                We received a request to reset your password. Use the code below:
              </p>
              <div style="background-color: white; border: 2px dashed #4CAF50; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px;">
                <span style="font-size: 36px; font-weight: bold; color: #4CAF50; letter-spacing: 5px;">
                  ${verificationCode}
                </span>
              </div>
              <p style="color: #999; font-size: 14px; text-align: center;">
                ⏰ This code will expire in 10 minutes.
              </p>
              <p style="color: #999; font-size: 14px; text-align: center;">
                If you didn't request this, please ignore this email.
              </p>
            </div>
            <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
              © 2024 MediFit. All rights reserved.
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Email sent:', info.messageId);
      
      res.status(200).json({ 
        message: "Verification code sent successfully to your email",
        email: user.email 
      });
      
    } catch (emailError) {
      console.error("❌ Email error:", emailError.message);
      
      // في حالة الفشل، أعطي الكود للاختبار
      res.status(200).json({ 
        message: "Email service temporarily unavailable",
        email: user.email,
        verificationCode: verificationCode,
        error: "Failed to send email. Use the code above to reset your password."
      });
    }

  } catch (error) {
    console.error("Server error:", error);
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