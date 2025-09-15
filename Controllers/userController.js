const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require("../models/User");
require('dotenv').config();

const register = async (req, res ,next) => {
    const { username, email, password } = req.body;
    try {
      const saltRounds = 10;  
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json('Email is already registered.');
        }

      const newUser = new User({ username, email, password: hashedPassword });
      await newUser.save();
      res.status(201).json(newUser);
    //   res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
      //res.status(500).json({ error: 'Server error' });
      next(error);
    }
  };

  const checkEmail = async (req, res) => {
    try {
        const { email } = req.body;
        
        // Check if the email exists in the database
        const user = await User.findOne({ email });
  
        if (user) {
            res.json({ isUnique: false });
        } else {
            res.json({ isUnique: true });
        }
    } catch (error) {
        console.error('Error checking email uniqueness:', error);
        res.status(500).json({ message: 'Server error' });
    }
  };

const getAllUser = async (req, res ,next) => {
    try {
      const user = await User.find();
      res.status(201).json(user);
    } catch (error) {
      //res.status(500).json({ error: 'Server error' });
      next(error);
    }
  };

  const getUserbyemail = async (req , res , next) =>{
    const { email } = req.query; 
  
    try {
        const user = await User.findOne({ email });
  
        if (!user) {
            return res.status(404).json({ error: 'User not found.' });
        }
  
        res.json(user);
    } catch (error) {
        console.error('Error retrieving user by email:', error);
        next(error);
    }
  };

  const login = async (req, res, next) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: 'user not found.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user._id, role: user.role }, process.env.SECRET_KEY, {
            expiresIn: '3h'
        });

        res.status(201).json({
            token,
            user: {
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        next(error);
    }
};


 
  
  
  module.exports = { register , getAllUser , login , checkEmail , getUserbyemail}
  
