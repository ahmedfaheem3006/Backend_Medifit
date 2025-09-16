const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");

require("dotenv").config();

// محاولة تحميل nodemailer بطريقة آمنة
let nodemailer = null;
let transporter = null;

try {
  nodemailer = require('nodemailer');
  console.log('Nodemailer loaded successfully');
  
  // إنشاء transporter مع الـ App Password
  if (nodemailer) {
    transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: 'ahmedfaheem3006@gmail.com', 
        pass: 'pktydrreixfwlup' 
      }
    });
    
    // التحقق من الاتصال
    transporter.verify(function(error, success) {
      if (error) {
        console.log('Email configuration error:', error);
        transporter = null;
      } else {
        console.log('Email server is ready to send messages');
      }
    });
  }
} catch (error) {
  console.log('Nodemailer not available:', error.message);
}

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

    // محاولة إرسال الإيميل
    if (transporter) {
      try {
        const mailOptions = {
          from: '"MediFit Support" <ahmedfaheem3006@gmail.com>', // ضع إيميلك هنا
          to: user.email,
          subject: 'Password Reset Code - MediFit',
          text: `Your password reset code is: ${verificationCode}. This code will expire in 10 minutes.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
                <h1>MediFit</h1>
              </div>
              <div style="padding: 30px; background-color: #f5f5f5;">
                <h2 style="color: #333;">Password Reset Request</h2>
                <p style="color: #666; font-size: 16px;">We received a request to reset your password. Use the code below:</p>
                <div style="background-color: white; border: 2px dashed #4CAF50; padding: 20px; text-align: center; margin: 20px 0;">
                  <span style="font-size: 36px; font-weight: bold; color: #4CAF50; letter-spacing: 5px;">
                    ${verificationCode}
                  </span>
                </div>
                <p style="color: #666; font-size: 14px;">⏰ This code will expire in 10 minutes.</p>
                <p style="color: #666; font-size: 14px;">If you didn't request this, please ignore this email.</p>
              </div>
              <div style="background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px;">
                © 2024 MediFit. All rights reserved.
              </div>
            </div>
          `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        
        res.status(200).json({ 
          message: "Verification code sent successfully to your email",
          email: user.email 
        });
      } catch (emailError) {
        console.error("Email sending failed:", emailError);
        
        res.status(200).json({ 
          message: "Code generated (email failed)",
          email: user.email,
          verificationCode: verificationCode,
          error: emailError.message
        });
      }
    } else {
      console.log(`Password reset code for ${email}: ${verificationCode}`);
      
      res.status(200).json({ 
        message: "Email service not available",
        email: user.email,
        verificationCode: verificationCode
      });
    }

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Failed to process request", error: error.message });
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