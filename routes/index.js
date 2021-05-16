const express = require("express");
const router = express.Router();
const { ensureAuthenticated, forwardAuthenticated } = require("../config/auth");
var MongoClient = require("mongodb").MongoClient;
var mongo = require("mongodb");
var assert = require("assert");
const db = require("../config/keys").mongoURI;

// Welcome Page
router.get("/", forwardAuthenticated, (req, res) => res.render("welcome"));
// Home
MongoClient.connect(db, { useUnifiedTopology: true }, function (err, db) {
  var dbo = db.db("agProg");
  let totalUsers;
  let users = dbo.collection("users");

  users
    .find({})
    .limit(100)
    .sort({ _id: 1 })
    .toArray(function (err, result) {
      if (err) {
        throw err;
      }
      totalUsers = result;
      router.get("/home", ensureAuthenticated, (req, res) => {
        var onlineUser = {
          statusControl: true,
          status: "online",
          connectionId: req.user.connectionId,
          room: req.user.room,
          name: req.user.name,
          email: req.user.email,
          password: req.user.password,
          date: req.user.date,
        };
        req.user.statusControl = true;

        if (req.user.statusControl === true) {
          users.updateOne(
            { _id: mongo.ObjectId(req.user.id) },
            { $set: onlineUser },
            function (err, result) {
              assert.strictEqual(null, err);
            }
          );
        }
        users
          .find({})
          .sort({ _id: 1 })
          .toArray(function (err, result) {
            if (err) throw err;
            res.render("homepage", {
              user: req.user,
              users: result,
            });
          });
      });

      router.get("/user-to-user/:userId", ensureAuthenticated, (req, res) => {
        res.render("usertouser", {
          user: req.user,
          users: totalUsers,
        });
      });
    });
});

//jsRoom
MongoClient.connect(db, { useUnifiedTopology: true }, function (err, db) {
  var dbo = db.db("agProg");
  let totalUsers;
  let jsRoomUsers = dbo.collection("users");
  jsRoomUsers
    .find({ room: "JavaScript" })
    .limit(100)
    .sort({ _id: 1 })
    .toArray(function (err, res) {
      if (err) throw err;

      totalUsers = res;

      router.get("/javascript", ensureAuthenticated, (req, res) => {
        res.render("rooms/javascript", {
          user: req.user,
          users: totalUsers,
        });
      });
    });
});

//pyRoom
MongoClient.connect(db, { useUnifiedTopology: true }, function (err, db) {
  var dbo = db.db("agProg");
  let totalUsers;
  let jsRoomUsers = dbo.collection("users");
  jsRoomUsers
    .find({ room: "Python" })
    .limit(100)
    .sort({ _id: 1 })
    .toArray(function (err, res) {
      if (err) throw err;

      totalUsers = res;

      router.get("/python", ensureAuthenticated, (req, res) => {
        res.render("rooms/python", {
          user: req.user,
          users: totalUsers,
        });
      });
    });
});

// Dashboard
router.get("/dashboard", ensureAuthenticated, (req, res) => {
  res.render("dashboard", {
    user: req.user,
  });
});

module.exports = router;
