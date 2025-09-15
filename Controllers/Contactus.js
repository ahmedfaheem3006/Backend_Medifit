// Controllers/contactController.js
const Contact = require("../models/Contactus");

// Submit contact form
const submitContactForm = async (req, res) => {
  try {
    const { fullName, email, phone, schedule, message } = req.body;
    
    const newContact = new Contact({
      fullName,
      email,
      phone,
      schedule: new Date(schedule), // Convert string date to Date object
      message
    });
    
    await newContact.save();
    
    res.status(201).json({ 
      success: true, 
      message: "Your message has been sent successfully. We'll get back to you soon!",
      contact: newContact
    });
  } catch (error) {
    console.error("Error submitting contact form:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to submit your message. Please try again later." 
    });
  }
};

// Get all contact submissions (admin only)
const getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.find().sort({ schedule: 1 }); 
    res.status(200).json({ success: true, contacts });
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch contact submissions." 
    });
  }
};

module.exports = {
  submitContactForm,
  getAllContacts
};