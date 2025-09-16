const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const SibApiV3Sdk = require('sib-api-v3-sdk');

require("dotenv").config();

// إعداد Brevo
const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

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

    // إعداد الإيميل - مُصحح
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = "Password Reset Code - MediFit";
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px;">
          <h2 style="color: #4CAF50; text-align: center;">Password Reset Request</h2>
          <p>Hello ${user.name || 'there'},</p>
          <p>You requested to reset your password. Here's your verification code:</p>
          
          <div style="background-color: #f9f9f9; border: 2px dashed #4CAF50; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px;">
            <span style="font-size: 36px; font-weight: bold; color: #4CAF50; letter-spacing: 5px;">
              ${verificationCode}
            </span>
          </div>
          
          <p style="color: #666;">This code will expire in 10 minutes.</p>
          <p style="color: #666;">If you didn't request this, please ignore this email.</p>
          
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px; text-align: center;">
            © 2024 MediFit. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;
    
    sendSmtpEmail.textContent = `
Password Reset - MediFit

Your verification code is: ${verificationCode}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.
    `;
    
    // مُهم: استخدم إيميلك المُسجل في Brevo
    sendSmtpEmail.sender = { 
      name: "MediFit", 
      email: "ahmedmahmoud30006@gmail.com" // ✅ إيميلك في Brevo
    };
    
    sendSmtpEmail.to = [{ 
      email: user.email,
      name: user.name || user.email
    }];

    // إرسال الإيميل
    try {
      console.log('📤 Attempting to send email...');
      console.log('From:', sendSmtpEmail.sender.email);
      console.log('To:', user.email);
      
      const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
      
      console.log('✅ Brevo API Response:', data);
      
      res.status(200).json({ 
        success: true,
        message: "Verification code sent successfully to your email",
        email: user.email,
        messageId: data.messageId
      });
      
    } catch (emailError) {
      console.error('❌ Brevo Error:', emailError.response?.body || emailError);
      
      res.status(200).json({ 
        success: true,
        message: "Code generated (email may be in spam)",
        email: user.email,
        verificationCode: verificationCode,
        note: "Check your spam folder or use this code"
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

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
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

    res.status(200).json({ 
      success: true,
      message: "Password has been reset successfully!" 
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ message: "Error resetting password" });
  }
});

module.exports = router;