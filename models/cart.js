const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const cartItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: "Listing"
    },
    quantity: {
        type: Number,
        default: 1
    }
});

// Cart Schema
const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: 'Listing' }, // Ensure this is an ObjectId
            quantity: { type: Number, required: true, min: 1 }
        }
    ]
});


module.exports = mongoose.model("Cart", cartSchema);
