const express = require("express");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const User = require("../models/user"); 
const passport = require("passport");
const router = express.Router();


require("dotenv").config();


console.log("GMAIL_USER:", process.env.GMAIL_USER);
console.log("GMAIL_PASS:", process.env.GMAIL_PASS ? "✔️ Loaded" : "❌ Missing");


router.get("/login", (req, res) => {
    res.render("auth/login"); 
});

// Handle login logic
router.post("/login", passport.authenticate("local", {
    failureRedirect: "/login",
    failureMessage: true
}), (req, res) => {
    res.redirect("/products");  
});

// Display the registration page
router.get("/register", (req, res) => {
    res.render("auth/register");  // Render the register view
});

// Handle registration logic
router.post("/register", async (req, res, next) => {
    try {
        const { username, password, email } = req.body;
        const user = new User({ username, email });
        const registeredUser = await User.register(user, password);  
        req.login(registeredUser, (err) => {
            if (err) return next(err);
            res.redirect("/products");  
        });
    } catch (e) {
        res.send("Error during registration: " + e.message);  
    }
});


router.get("/forgot-password", (req, res) => {
    res.render("auth/forgot-password");  
});


router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    console.log("Received email: ", email);  

    const user = await User.findOne({ email });

    if (!user) {
        console.log("No user found with that email");  
        return res.status(400).send("No account with that email found.");
    }


    const resetToken = crypto.randomBytes(20).toString("hex");
    const resetPasswordExpires = Date.now() + 3600000; 

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetPasswordExpires;
    await user.save();


    

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 465,  
        secure: false,  
        auth: {
          user: 'goudvenki5@gmail.com',
          pass: 'venky@241',
        },
        tls: {
          minVersion: 'TLSv1.2',
        },
        socketTimeout: 60000, 
      });
      


   
    console.log("Transporter created with Gmail credentials");

    const resetUrl = `http://${req.headers.host}/reset-password/${resetToken}`;
    const mailOptions = {
        to: email,
        from: process.env.GMAIL_USER,
        subject: "Password Reset Request",
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\nPlease click on the following link to reset your password:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            console.log("Error sending email:", err);  
            return res.status(500).send("Error sending email.");
        }
        console.log("Email sent successfully");  
        res.render("auth/forgot-password", { message: "An email has been sent to your address with further instructions." });
    });
});

// Display the reset password page
router.get("/reset-password/:token", (req, res) => {
    const { token } = req.params;
    User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } })
        .then((user) => {
            if (!user) {
                return res.status(400).send("Password reset token is invalid or has expired.");
            }
            res.render("auth/reset-password", { token });
        })
        .catch((err) => {
            console.log("Error:", err);
            res.status(500).send("Server error.");
        });
});

// Handle password reset logic
router.post("/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send("Password reset token is invalid or has expired.");
        }

        user.setPassword(password, async () => {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();
            res.redirect("/login");  
        });
    } catch (err) {
        console.log("Error:", err);
        res.status(500).send("Server error.");
    }
});

// Handle logout
router.get("/logout", (req, res, next) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect("/products");  
    });
});

module.exports = router;
