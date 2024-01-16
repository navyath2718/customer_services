// index.js
const express = require("express");
const passport = require("passport");
const session = require("express-session");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const Intercom = require("intercom-node");

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store for customer service requests
const customerServiceRequests = {
  generalQueries: [],
  productFeaturesQueries: [],
  productPricingQueries: [],
  featureImplementationRequests: [],
};

// Configure Google OAuth
passport.use(
  new GoogleStrategy(
    {
      clientID: "your-google-client-id",
      clientSecret: "your-google-client-secret",
      callbackURL: "http://localhost:3000/auth/google/callback",
    },
    (accessToken, refreshToken, profile, done) => {
      // You can save user data in the database here
      return done(null, profile);
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Configure Intercom
const intercom = new Intercom.Client({
  token: "your-intercom-access-token",
});

// Express middlewares
app.use(
  session({ secret: "your-secret-key", resave: true, saveUninitialized: true })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(express.json());

// Google OAuth routes
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    res.redirect("/");
  }
);

// Customer service interaction routes
app.post("/submit-request", (req, res) => {
  const { category, comment } = req.body;
  if (!category || !comment) {
    return res.status(400).json({ error: "Category and comment are required" });
  }

  // Save the request to the in-memory store
  const newRequest = { comment, user: req.user };
  customerServiceRequests[category.toLowerCase()].push(newRequest);

  // Create an Intercom conversation for the new request
  intercom.conversations.create({
    user_id: req.user.id,
    body: newRequest.comment,
  });

  res.json({ success: true });
});

// Data retrieval routes
app.get("/requests/:category", (req, res) => {
  const { category } = req.params;
  if (!customerServiceRequests[category]) {
    return res.status(404).json({ error: "Category not found" });
  }

  res.json({ requests: customerServiceRequests[category] });
});

// Start the server
app.listen(PORT, () => {
  console.log("Server is Running on" + { PORT });
});
