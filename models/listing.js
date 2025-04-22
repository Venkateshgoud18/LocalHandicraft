const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const listingSchema = new Schema({
    title: String,
    description: String,
    price: Number,
    image: String,
    location: String,
    handicrafted: Boolean,
    
});

module.exports = mongoose.model("Listing", listingSchema);
