const mongoose=require("mongoose");


const listingSchema=new mongoose.Schema({
    title: {
        type:String,
    },
    description:String,
    image:{
        type:String,
        default:"https://tse1.mm.bing.net/th?id=OIP.QsoaqkIT8BNLughj8668ogHaDj&pid=Api&P=0&h=180",
        set:(v)=>v===""?"https://tse1.mm.bing.net/th?id=OIP.QsoaqkIT8BNLughj8668ogHaDj&pid=Api&P=0&h=180":v,
    },
    price:Number,
    location:String,
    handicrafted:Boolean,
});

const Listing=mongoose.model("Listing",listingSchema);
module.exports=Listing;