// models/user.js
const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    resetPasswordToken: String,    // Store reset token
    resetPasswordExpires: Date     // Store expiration time
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
