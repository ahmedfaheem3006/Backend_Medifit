const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
require('dotenv').config();

async function createInitialAdmin() {
    const adminEmail = process.env.adminEmail ;
    const adminPassword = process.env.adminPassword ;
  
    try {
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (existingAdmin) {
          console.log('Admin user already exists.');
          return;
        }

        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        const admin = new User({
        username: 'admin',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
    });
  
      await admin.save();
    //   console.log('Admin user created');

    } catch (error) {
      console.error('Error creating admin user:', error);
    }
  }
  
module.exports = createInitialAdmin;








// const createInitialAdmin = async () => {
//     try {
//       // Connect to the database
//       await mongoose.connect(process.env.MONGODB_URI, {
//         useNewUrlParser: true,
//         useUnifiedTopology: true,
//       });
  
//       // Check if any admin user exists
//       const existingAdmin = await User.findOne({ role: 'admin' });
//       if (existingAdmin) {
//         console.log('Admin user already exists.');
//         return;
//       }
  
//       // Create a new admin user
//       const admin = new User({
//         username: 'admin', // You can change this username
//         email: 'admin@example.com', // Use a proper email
//         password: await bcrypt.hash('password', 10), // Use a secure password and hash it
//         role: 'admin',
//       });
  
//       await admin.save();
//       console.log('Admin user created successfully.');
//     } catch (error) {
//       console.error('Error creating admin user:', error);
//     } finally {
//       // Close the database connection
//       mongoose.connection.close();
//     }
//   };
  
//   createInitialAdmin();
  
  