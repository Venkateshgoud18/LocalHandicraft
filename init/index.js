const mongoose=require("mongoose");
const data=require("./data.js");

const mongoose_url="mongodb://127.0.0.1:27017/handcraft";

const Listing=require("../models/listing");

main()
.then(()=>{
    console.log("connected to db");
})
.catch((err)=>{
    console.log(err);
})
async function main() {
    await mongoose.connect(mongoose_url);
}
const initDB=async()=>{
    await Listing.deleteMany({});
    await Listing.insertMany(data.data);
    console.log("inserted in DB");
};
initDB();