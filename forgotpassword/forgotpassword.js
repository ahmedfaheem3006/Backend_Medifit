const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const SibApiV3Sdk = require('sib-api-v3-sdk');

require("dotenv").config();

// إعداد Brevo مع API Key
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

    // إعداد محتوى الإيميل
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.subject = "Password Reset Code - MediFit";
    sendSmtpEmail.htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
          <div style="background-color: #4CAF50; padding: 40px 20px; text-align: center;">
            <h1 style="margin: 0; color: white; font-size: 36px; font-weight: bold;">MediFit</h1>
            <p style="margin: 10px 0 0 0; color: white; font-size: 16px;">Your Health Companion</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="margin: 0 0 20px 0; color: #333; font-size: 28px; text-align: center;">Password Reset Request</h2>
            
            <p style="margin: 0 0 30px 0; color: #666; font-size: 16px; line-height: 1.6; text-align: center;">
              Hello ${user.name || 'User'},<br>
              We received a request to reset your password. Use the verification code below:
            </p>
            
            <!-- Code Box -->
            <div style="background-color: #f8f9fa; border: 3px solid #4CAF50; border-radius: 10px; padding: 30px; text-align: center; margin: 30px 0;">
              <p style="margin: 0 0 10px 0; color: #666; font-size: 14px;">Your verification code is:</p>
              <div style="font-size: 42px; font-weight: bold; color: #4CAF50; letter-spacing: 8px; margin: 10px 0;">
                ${verificationCode}
              </div>
            </div>
            
            <div style="background-color: #fff3cd; border: 1px solid #ffeeba; border-radius: 5px; padding: 15px; margin: 30px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                ⏰ <strong>Important:</strong> This code will expire in 10 minutes.
              </p>
            </div>
            
            <p style="margin: 30px 0 0 0; color: #999; font-size: 14px; text-align: center; line-height: 1.6;">
              If you didn't request this password reset, please ignore this email.<br>
              Your password will remain unchanged.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #333; padding: 30px; text-align: center;">
            <p style="margin: 0 0 10px 0; color: #fff; font-size: 14px;">
              Need help? Contact us at support@medifit.com
            </p>
            <p style="margin: 0; color: #999; font-size: 12px;">
              © 2024 MediFit. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    sendSmtpEmail.textContent = `
MediFit Password Reset

Hello ${user.name || 'User'},

We received a request to reset your password. Your verification code is:

${verificationCode}

This code will expire in 10 minutes.

If you didn't request this password reset, please ignore this email.

Best regards,
The MediFit Team
    `;
    
    // معلومات المرسل والمستقبل
    sendSmtpEmail.sender = { 
      name: "MediFit Support", 
      email: "noreply@medifit.com"
    };
    sendSmtpEmail.to = [{ 
      email: user.email,
      name: user.name || user.email
    }];
    
    sendSmtpEmail.replyTo = { 
      email: "support@medifit.com", 
      name: "MediFit Support" 
    };

    // إرسال الإيميل
    try {
      console.log('Attempting to send email to:', user.email);
      const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
      console.log('✅ Email sent successfully:', data);
      
      res.status(200).json({ 
        success: true,
        message: "Verification code sent successfully to your email",
        email: user.email
      });
      
    } catch (emailError) {
      console.error('❌ Brevo API Error:', emailError.response?.body || emailError);
      
      // في حالة فشل الإرسال، أعطي الكود للمستخدم
      res.status(200).json({ 
        success: true,
        message: "Code generated (Email service error)",
        email: user.email,
        verificationCode: verificationCode,
        error: "Failed to send email. Use the code above.",
        debugInfo: emailError.response?.body?.message || emailError.message
      });
    }

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ 
      success: false,
      message: "Failed to process request",
      error: error.message 
    });
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

    // إرسال إيميل تأكيد (اختياري)
    try {
      const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
      sendSmtpEmail.subject = "Password Reset Successful - MediFit";
      sendSmtpEmail.htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0;">MediFit</h1>
          </div>
          <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Password Reset Successful ✅</h2>
            <p style="color: #666;">Your password has been successfully reset.</p>
            <p style="color: #666;">You can now log in with your new password.</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 14px;">If you didn't make this change, please contact support immediately.</p>
          </div>
        </div>
      `;
      sendSmtpEmail.sender = { name: "MediFit", email: "noreply@medifit.com" };
      sendSmtpEmail.to = [{ email: user.email }];
      
      await apiInstance.sendTransacEmail(sendSmtpEmail);
    } catch (emailError) {
      console.log('Confirmation email failed:', emailError);
    }

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