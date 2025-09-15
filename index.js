require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const createInitialAdmin = require("./Controllers/CreateInitialadmin");
const dns = require("dns");
const googleuser = require("./models/googleuser");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const cookieSession = require("cookie-session");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const userRoutes = require("./routes/user");
const productRoutes = require("./routes/product");
const forgotpassword = require("./forgotpassword/forgotpassword");
const ContactusRoutes = require("./routes/Contactus");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/order");
const newsletterRoutes = require("./routes/newsletter");
const adminRoutes = require("./middlewares/admin");
const path = require("path");
const bodyParser = require("body-parser");


// Set DNS servers
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5500;

// Database connection with retry logic
let isConnected = false;

const connectdb = async () => {
  if (isConnected) {
    return;
  }

  try {
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://Medifit:m7j0pADbeL4nMXk3@medifit.x3ym908.mongodb.net/?retryWrites=true&w=majority&appName=Medifit",
      {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        maxPoolSize: 10,
        minPoolSize: 5,
      }
    );

    isConnected = true;
    console.log("✅ MongoDB connected");

    // استدعاء createInitialAdmin بعد التأكد من الاتصال
    if (mongoose.connection.readyState === 1) {
      createInitialAdmin().catch(console.error);
    }
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    isConnected = false;
    
    // في Production، أوقف التطبيق إذا فشل الاتصال
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    // في Development، حاول مرة أخرى
    setTimeout(connectdb, 5000);
  }
};

// Mongoose connection event listeners
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
  isConnected = true;
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
  isConnected = false;
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected");
  isConnected = false;
  // محاولة إعادة الاتصال
  setTimeout(connectdb, 5000);
});

// بدء الاتصال بقاعدة البيانات فوراً
connectdb();

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));


// CORS configuration محدث خصيصاً لـ iOS
const corsOptions = {
  origin: function (origin, callback) {
    // مهم جداً: السماح للطلبات بدون origin (iOS apps)
    if (!origin) return callback(null, true);
    
    // في Production: السماح بكل الـ origins مؤقتاً لحل مشكلة iOS
    if (process.env.NODE_ENV === "production") {
      return callback(null, true);
    }
    
    callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
  allowedHeaders: "*", // السماح بكل الـ headers
  exposedHeaders: ["Authorization"],
  optionsSuccessStatus: 200, // مهم لـ iOS Safari
  preflightContinue: false
};

// تطبيق CORS
app.use(cors(corsOptions));

// مهم جداً: handle لـ preflight requests
app.options('*', cors(corsOptions));

// إضافة headers يدوياً لكل الـ responses (حل إضافي قوي)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // مهم لـ iOS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

app.use(cors(corsOptions));

// Middleware
app.use(express.json());
app.use(bodyParser.json({ type: "application/json" }));

// Session configuration مع MongoStore لحل مشكلة Memory leak
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-super-secret-key-change-this",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI ||
        "mongodb+srv://Medifit:m7j0pADbeL4nMXk3@medifit.x3ym908.mongodb.net/?retryWrites=true&w=majority&appName=Medifit",
      touchAfter: 24 * 3600 // lazy session update
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Root route - مهم جداً لـ Railway
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Medifit Backend API is running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      users: '/users',
      products: '/products',
      cart: '/cart',
      orders: '/orders',
      contactus: '/contactus',
      newsletter: '/newsletter',
      auth: {
        google: '/auth/google',
        login: '/users/login',
        signup: '/users/signup'
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint محسّن
app.get('/health', (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    environment: process.env.NODE_ENV || 'development',
    mongodb: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      readyState: mongoose.connection.readyState
    }
  };
  
  try {
    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.message = error.message;
    res.status(503).json(healthcheck);
  }
});

// Middleware للتأكد من الاتصال أو إعادة المحاولة
app.use(async (req, res, next) => {
  // تخطي root و health check endpoints
  if (req.path === "/" || req.path === "/health") {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    // محاولة الاتصال مرة أخرى
    await connectdb();

    // انتظر قليلاً للتأكد من الاتصال
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({
        error: "Database connection not ready",
        status: "Service Unavailable",
        message: "Please try again in a few seconds",
      });
    }
  }
  next();
});

// Routes
app.use("/users", userRoutes);
app.use("/products", productRoutes);
app.use("/forgot", forgotpassword);
app.use("/contactus", ContactusRoutes);
app.use("/cart", cartRoutes);
app.use("/orders", orderRoutes);
app.use("/newsletter", newsletterRoutes);
app.use("/admin", adminRoutes);

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://medifitbackend-production.up.railway.app/auth/google/callback",
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await googleuser.findOne({ googleId: profile.id });

        if (!user) {
          user = await googleuser.create({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails[0].value,
            role: "user",
          });
        }

        return done(null, user);
      } catch (err) {
        console.error("Google OAuth error:", err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth Routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/auth/google/cancel" }),
  (req, res) => {
    try {
      const userRole = req.user.role || "user";
      const token = jwt.sign(
        {
          id: req.user._id.toString(),
          role: userRole,
        },
        process.env.SECRET_KEY || "your-secret-key",
        { expiresIn: "3h" }
      );

      const userData = {
        username: req.user.name,
        email: req.user.email,
        googleId: req.user.googleId,
        role: userRole
      };

      const frontendURL =
        process.env.NODE_ENV === "production"
          ? process.env.FRONTEND_URL || "https://medifit1.netlify.app"
          : "http://localhost:4200";

      res.send(`
        <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'auth_success',
                token: '${token}',
                user: ${JSON.stringify(userData)}
              }, '${frontendURL}');
              window.close();
            } else {
              window.location.href = '${frontendURL}/home?token=${token}';
            }
          </script>
        </body>
        </html>
      `);
    } catch (error) {
      console.error("Error in Google callback:", error);
      res.status(500).send("Authentication failed");
    }
  }
);

app.get("/auth/google/cancel", (req, res) => {
  const frontendURL =
    process.env.NODE_ENV === "production"
      ? process.env.FRONTEND_URL || "https://medifit1.netlify.app"
      : "http://localhost:4200";
  res.redirect(`${frontendURL}/signup`);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error("Error:", error);
  const statusCode = error.statusCode || 500;
  const message = error.message || "Internal Server Error";
  res.status(statusCode).json({ 
    error: message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler - يجب أن يكون آخر شيء
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    message: "The requested endpoint was not found",
    path: req.originalUrl
  });
});

// Start server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server is running on http://0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}).on('error', (error) => {
  console.error("❌ Server failed to start:", error);
});

module.exports = app;