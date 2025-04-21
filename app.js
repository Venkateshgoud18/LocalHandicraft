const express=require("express");
const app=express();
const mongoose=require("mongoose");
const port=8080;
const Listing=require("./models/listing.js");
const data=require("./init/data.js");
const mongoose_url="mongodb://127.0.0.1:27017/handcraft";
const path=require("path");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const {productSchema}=require("./schema.js");

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
app.set("view engine","ejs");
app.set("views",path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs',ejsMate);
app.use(express.static("public"));
app.use(express.static(path.join(__dirname,"/public")));

const initDB=async()=>{
    await Listing.deleteMany({});
    await Listing.insertMany(data);
    console.log("inserted in DB");
};
initDB();
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user");

// Setup session
app.use(session({
    secret: "notagoodsecret", // use env variables in real apps
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});


app.get("/home",(req,res)=>{
    res.send("Home page")
});

const validateProducts=(req,res,next)=>{
    let {error}=productSchema.validate(req.body);
    if(error){
        let errMsg=error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400,errMsg);
    }
    else{
        next();
    }
}

const isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/login");
    }
    next();
};

const isAdmin = (req, res, next) => {
    if (!req.isAuthenticated() || req.user.username !== "venky1026") {
        return res.redirect("/login");
    }
    next();
};
async function createAdminUser() {
    try {
        const user = new User({ username: "venky1026", email: "venky1026@gmail.com" });
        await User.register(user, "1026");
        console.log("✅ Admin user created!");
    } catch (err) {
        console.log("⚠️ Couldn't create admin user:", err.message);
    }
}



createAdminUser();

/*app.get("/testListing",async (req,res)=>{
    let sampleListing=new Listing({
        title:"local handicraft",
        description:"handicraft product",
        price:1200,
        image:"",
        location:"Nagarkurnool",
        handicrafted:true,
    });
    await sampleListing.save();
    console.log("sample was saved");
    res.send("succesfully enetered");
})*/
app.get("/products",async (req,res)=>{
    const alllistings=await Listing.find({});
    res.render("index.ejs",{alllistings});
})
//new route
// Add Product Page - Protected
app.get("/products/new", isAdmin, (req, res) => {
    res.render("new.ejs");
});

//get route
app.get("/products/:id", wrapAsync(async (req, res, next) => {
    const { id } = req.params;  // Get the product id from the URL parameter
    const product = await Listing.findById(id).populate("owner");

    if (!product) {
        return next(new ExpressError(404, "Product Not Found"));
    }

    res.render("show.ejs", { product });  // Pass product to the view
}));


 


//create route
app.post("/products",isAdmin, validateProducts, wrapAsync(async (req, res) => {
    const { title, description, image} = req.body;
    const newListing = new Listing({ title, description, image });
    await newListing.save();
    res.redirect("/products");
}));


//edit route
app.get("/products/:id/edit", isAdmin, wrapAsync(async (req, res) => {
    let { id } = req.params;
    const products = await Listing.findById(id);
    res.render("edit.ejs", { products });
}));
//update route
app.put("/products/:id", isAdmin, validateProducts, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndUpdate(id, { ...req.body.products });
    res.redirect(`/products/${id}`);
}));
//delete route
app.delete("/products/:id", isLoggedIn, wrapAsync(async (req, res) => {
    const { id } = req.params;
    await Listing.findByIdAndDelete(id);
    res.redirect("/products");
}));
// Sign up form
app.get("/register", (req, res) => {
    res.render("auth/register"); // create this view
});

// Sign up logic
app.post("/register", async (req, res, next) => {
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

// Login form
app.get("/login", (req, res) => {
    res.render("auth/login"); // create this view
});

// Login logic
app.post("/login", passport.authenticate("local", {
    failureRedirect: "/login",
    failureMessage: true
}), (req, res) => {
    res.redirect("/products");
});

// Logout route
app.get("/logout", (req, res,next) => {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect("/products");
    });
});


// Example: protect "new" route
app.get("/products/new", isLoggedIn, (req, res) => {
    res.render("new.ejs");
});




app.all("*",(req,res,next)=>{
    next(new ExpressError(404,"Page Not Found"));
})

app.use((err,req,res,next)=>{
    let {statusCode=500,message="something went wrong"}=err;
    res.render("error.ejs",{message});
    //res.status(statusCode).send(message);
})

app.listen(port,(req,res)=>{
    console.log(`app is listening ${port}`);
})
