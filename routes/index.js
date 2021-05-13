const express = require("express");
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require("../config/auth");

// Welcome Page
router.get("/", forwardAuthenticated, (req, res) => res.render("welcome"));
// Home
router.get("/home", ensureAuthenticated, (req, res) =>
  res.render("homepage", {
    user: req.user,
  })
);

// Dashboard
router.get("/dashboard", ensureAuthenticated, (req, res) =>
  res.render("dashboard", {
    user: req.user,
  })
);

module.exports = router;
