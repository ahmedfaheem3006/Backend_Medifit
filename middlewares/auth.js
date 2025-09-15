const jwt = require("jsonwebtoken");
const User = require("../models/User");
const GoogleUser = require("../models/googleuser"); // Import Google user model

const auth = (roles = []) => {
  return async (req, res, next) => {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ error: "No token provided." });
    }

    try {
      const decoded = jwt.verify(token, process.env.SECRET_KEY);

      if (!decoded) {
        return res
          .status(400)
          .json({ error: "Invalid token, decoding failed." });
      }

      // First check in regular User model
      let userauth = await User.findOne({ _id: decoded.id });
      let isGoogleUser = false;

      // If not found in regular users, check Google users
      if (!userauth) {
        userauth = await GoogleUser.findOne({ _id: decoded.id });
        isGoogleUser = !!userauth; // Set flag if this is a Google user
      }

      // If user is not found in either model
      if (!userauth) {
        return res.status(401).json({ error: "User not found or token invalid." });
      }

      req.user = userauth;
      
      // For Google users, check if role is in the allowed roles list or if "google_user" is allowed
      if (roles.length) {
        const userRole = req.user.role || 'user';
        const isAllowed = roles.includes(userRole) || 
                          (isGoogleUser && roles.includes('google_user'));
        
        if (!isAllowed) {
          return res
            .status(403)
            .json({ error: "Access denied. Insufficient permissions." });
        }
      }

      next();
    } catch (error) {
      console.log("Auth error:", error);
      
      if (error.name === "JsonWebTokenError") {
        return res.status(401).json({ error: "Invalid token." });
      } else if (error.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Token has expired." });
      } else {
        return res.status(500).json({ error: "Internal server error." });
      }
    }
  };
};

module.exports = auth;