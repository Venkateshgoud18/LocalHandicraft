const express=require("express");
const app=express();
const mongoose=require("mongoose");
const port=3000;
const Listing=require("./models/listing.js");
const data=require("./init/data.js");
const mongoose_url="mongodb://127.0.0.1:27017/handcraft";
const path=require("path");
const methodOverride=require("method-override");
const ejsMate=require("ejs-mate");
const wrapAsync=require("./utils/wrapAsync.js");
const ExpressError=require("./utils/ExpressError.js");
const {productSchema}=require("./schema.js");
const authRoutes = require("./routes/auth");
const Cart = require("./models/cart");
app.use(methodOverride('_method'));
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

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



app.use(async (req, res, next) => {
    res.locals.currentUser = req.user;

    try {
        if (req.user) {
            const cart = await Cart.findOne({ user: req.user._id });
            res.locals.currentUserCart = cart || { items: [] };
        } else {
            res.locals.currentUserCart = { items: [] };
        }
    } catch (err) {
        console.error("Error fetching cart:", err);
        res.locals.currentUserCart = { items: [] }; // Safe fallback
    }

    next();
});


passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

app.use(authRoutes);
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
app.get("/products", async (req, res) => {
    const alllistings = await Listing.find({}).sort({ _id: 1 });  // Sort products by ID
    res.render("index.ejs", { alllistings });
});

//new route
// Add Product Page - Protected
app.get("/products/new", isAdmin,isLoggedIn, (req, res) => {
    res.render("new.ejs");
});

//get route
app.get("/products/:id", wrapAsync(async (req, res, next) => {
    const { id } = req.params;  // Get the product ID from the URL
    console.log("Requested product ID:", id);  // Debugging
    const product = await Listing.findById(id);

    if (!product) {
        return next(new ExpressError(404, "Product Not Found"));
    }

    res.render("show.ejs", { product });  // Pass product data to the view
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
// Import the Cart model
app.get("/cart", isLoggedIn, wrapAsync(async (req, res) => {
    const user = req.user;
    let cart = await Cart.findOne({ user: user._id }).populate("items.product");

    if (!cart) {
        return res.render("cart.ejs", { cart: null });
    }

    // Remove items with invalid product references
    cart.items = cart.items.filter(item => item.product !== null);

    // Save the updated cart
    await cart.save();

    res.render("cart.ejs", { cart });
}));






// Add to Cart Route
app.post("/cart/add/:productId", isLoggedIn, wrapAsync(async (req, res) => {
    const { productId } = req.params;
    const user = req.user; // Get the currently logged-in user

    // Find or create the user's cart
    let cart = await Cart.findOne({ user: user._id });
    if (!cart) {
        cart = new Cart({ user: user._id, items: [] });
    }

    // Check if the product is already in the cart
    const productIndex = cart.items.findIndex(item => item.product.toString() === productId);
    if (productIndex >= 0) {
        // Product exists in cart, increment quantity
        cart.items[productIndex].quantity += 1;
    } else {
        // Product not in cart, add it
        cart.items.push({ product: productId, quantity: 1 });
    }

    // Save the cart after updating
    await cart.save(); // Ensure cart is saved after adding/updating the item

    // Redirect to products page after adding to cart
    res.redirect("/products");
}));



// View Cart Route

// Update quantity in cart (PUT)
app.put("/cart/update/:productId", isLoggedIn, wrapAsync(async (req, res) => {
    const { productId } = req.params;
    const { action } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) return res.redirect("/cart");

    const item = cart.items.find(i => i.product.toString() === productId);

    if (!item) return res.redirect("/cart");

    if (action === "increment") {
        item.quantity += 1;
    } else if (action === "decrement" && item.quantity > 1) {
        item.quantity -= 1;
    }

    await cart.save();
    res.redirect("/cart");
}));


// Remove Item from Cart Route
// Remove Item from Cart Route
app.delete("/cart/remove/:productId", isLoggedIn, wrapAsync(async (req, res) => {
    const { productId } = req.params;
    const user = req.user;

    const cart = await Cart.findOne({ user: user._id });

    if (cart) {
        cart.items = cart.items.filter(item => item.product.toString() !== productId);
        await cart.save();
    }

    res.redirect("/cart");
}));
app.post("/create-checkout-session", isLoggedIn, wrapAsync(async (req, res) => {
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");

    if (!cart || cart.items.length === 0) {
        return res.redirect("/cart");
    }

    const line_items = cart.items.map(item => ({
        price_data: {
            currency: 'usd',
            product_data: {
                name: item.product.title,
            },
            unit_amount: item.product.price * 100, // in cents
        },
        quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items,
        success_url: 'http://localhost:3000/success',
        cancel_url: 'http://localhost:3000/cancel',
    });

    res.redirect(303, session.url);
}));






// Add the cart to res.locals so it can be accessed globally in all views


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

app.get("/success", (req, res) => {
    res.send("✅ Payment successful! Thank you for your order.");
});

app.get("/cancel", (req, res) => {
    res.send("❌ Payment was cancelled.");
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
