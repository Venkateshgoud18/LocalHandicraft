const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    }
});

userSchema.plugin(passportLocalMongoose); // adds username, hash, salt, and convenience methods

module.exports = mongoose.model("User", userSchema);
