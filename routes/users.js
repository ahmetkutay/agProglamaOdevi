const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const passport = require("passport");
// Load User model
const User = require("../models/User");
const { forwardAuthenticated } = require("../config/auth");
var MongoClient = require("mongodb").MongoClient;
var mongo = require("mongodb");
var assert = require("assert");
const db = require("../config/keys").mongoURI;

// Login Page
router.get("/login", forwardAuthenticated, (req, res) => res.render("login"));

// Register Page
router.get("/register", forwardAuthenticated, (req, res) =>
  res.render("register")
);

// Register
router.post("/register", (req, res) => {
  const { name, email, password, password2 } = req.body;
  let errors = [];

  if (!name || !email || !password || !password2) {
    errors.push({ msg: "Please enter all fields" });
  }

  if (password != password2) {
    errors.push({ msg: "Passwords do not match" });
  }

  if (password.length < 6) {
    errors.push({ msg: "Password must be at least 6 characters" });
  }

  if (errors.length > 0) {
    res.render("register", {
      errors,
      name,
      email,
      password,
      password2,
    });
  } else {
    User.findOne({ email: email }).then((user) => {
      if (user) {
        errors.push({ msg: "Email already exists" });
        res.render("register", {
          errors,
          name,
          email,
          password,
          password2,
        });
      } else {
        const newUser = new User({
          name,
          email,
          password,
        });

        bcrypt.genSalt(10, (err, salt) => {
          bcrypt.hash(newUser.password, salt, (err, hash) => {
            if (err) throw err;
            newUser.password = hash;
            newUser
              .save()
              .then((user) => {
                req.flash(
                  "success_msg",
                  "You are now registered and can log in"
                );
                res.redirect("/users/login");
              })
              .catch((err) => console.log(err));
          });
        });
      }
    });
  }
});

// Login
router.post("/login", (req, res, next) => {
  passport.authenticate("local", {
    successRedirect: "/home",
    failureRedirect: "/users/login",
    failureFlash: true,
  })(req, res, next);
});

// Logout
MongoClient.connect(db, { useUnifiedTopology: true }, function (err, db) {
  var dbo = db.db("agProg");
  let users = dbo.collection("users");
  users
    .find({})
    .limit(100)
    .sort({ _id: 1 })
    .toArray(function (err, res) {
      if (err) {
        throw err;
      }
      router.get("/logout", (req, res) => {
        var offlineUser = {
          statusControl: false,
          status: "offline",
          connectionId: req.user.connectionId,
          name: req.user.name,
          email: req.user.email,
          password: req.user.password,
          date: req.user.date,
        };

        users.updateOne(
          { _id: mongo.ObjectId(req.user.id) },
          { $set: offlineUser },
          function (err, result) {
            assert.strictEqual(null, err);
          }
        );
        req.logout();
        req.flash("success_msg", "You are logged out");
        res.redirect("/users/login");
      });
    });
});

module.exports = router;
