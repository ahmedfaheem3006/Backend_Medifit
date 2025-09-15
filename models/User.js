const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const Userschema = new Schema ({
    username: { type: String , required: true,unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String , enum : ['user', 'supervisor', 'admin'], default: "user" },
    verificationCode: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
});

const User = mongoose.model("User", Userschema);

module.exports =  User ;