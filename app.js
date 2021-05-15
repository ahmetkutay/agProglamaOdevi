const express = require("express");
const expressLayouts = require("express-ejs-layouts");
const mongoose = require("mongoose");
const passport = require("passport");
const flash = require("connect-flash");
const session = require("express-session");
const socket = require("socket.io");
var MongoClient = require("mongodb").MongoClient;
const app = express();
const server = app.listen(5000);
const io = socket(server);
var mongo = require("mongodb");
var assert = require("assert");
var chatUserModule = require("./module/userchatsmodule");
var socketler = [];

// Passport Config
require("./config/passport")(passport);

// DB Config
const db = require("./config/keys").mongoURI;
const { text } = require("express");

// Connect to MongoDB and socket.io
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB Connected");

    io.on("connection", (socket) => {
      MongoClient.connect(db, { useUnifiedTopology: true }, function (err, db) {
        var dbo = db.db("agProg");
        let userChats = dbo.collection("userchats");
        let jsRoom = dbo.collection("jschats");
        let pyRoom = dbo.collection("pychats");
        let chat = dbo.collection("chats");
        let users = dbo.collection("users");

        let user = socket.handshake.query.name;
        users.updateOne(
          { _id: mongo.ObjectId(user) },
          { $set: { connectionId: socket.id } },
          function (err, result) {
            assert.strictEqual(null, err);
          }
        );
        chat
          .find({})
          .limit(100)
          .sort({ _id: 1 })
          .toArray(function (err, res) {
            if (err) {
              throw err;
            }

            // Emit the messages
            socket.emit("output", res);
          });

        socket.on("input", (data) => {
          let name = data.name;
          let message = data.message;

          chat.insertOne({ name: name, message: message }, function () {
            io.sockets.emit("output", [data]);
          });
        });

        socket.join("javascript");
        jsRoom
          .find({})
          .limit(100)
          .sort({ _id: 1 })
          .toArray(function (err, res) {
            if (err) {
              throw err;
            }

            socket.emit("jschat", res);
          });

        socket.on("javascriptChatMessage", (msg) => {
          let name = msg.name;
          let message = msg.message;
          jsRoom.insertOne({ name: name, message: message }, function () {
            io.to("javascript").emit("jschat", [msg]);
          });
        });

        socket.join("python");

        pyRoom
          .find({})
          .limit(100)
          .sort({ _id: 1 })
          .toArray(function (err, res) {
            if (err) {
              throw err;
            }

            socket.emit("pychat", res);
          });

        socket.on("pythonChatMessage", (msg) => {
          let name = msg.name;
          let message = msg.message;
          pyRoom.insertOne({ name: name, message: message }, function () {
            io.to("python").emit("pychat", [msg]);
          });
        });

        socket.on("getMessages", (data) => {
          userChats
            .find({
              $or: [
                { senderId: user, recieverId: data.recieverId },
                { senderId: data.recieverId, recieverId: user },
              ],
            })
            .limit(100)
            .sort({ _id: 1 })
            .toArray(function (err, res) {
              if (err) throw err;
              //console.log(res);
              socket.emit("userOutput", res);
            });
        });

        socket.on("userInput", (data) => {
          let name = data.name;
          let message = data.message;
          let recieverId = data.recieverId;
          let myConnId = data.myConnId;

          //console.log(data);
          //console.log(name);
          let recUserConn = "";
          receiverUsers = users.findOne(
            { _id: mongo.ObjectId(recieverId) },
            function (err, res) {
              if (err) throw err;
              //console.log(res);
              recUserConn = res.connectionId;
              if (recUserConn === null || recUserConn === "") {
                userChats.insertOne(
                  {
                    name: name,
                    message: message,
                    recieverId: recieverId,
                    senderId: user,
                  },
                  function (err, result) {
                    io.to(myConnId).emit("userOutput", [data]);
                  }
                );
              } else {
                userChats.insertOne(
                  {
                    name: name,
                    message: message,
                    recieverId: recieverId,
                    senderId: user,
                  },
                  function (err, result) {
                    io.to(recUserConn).to(myConnId).emit("userOutput", [data]);
                  }
                );
              }
              //return res;
            }
          );
          // io.sockets.emit("userOutput", [data]);
        });
      }); //bura db
    });
  })
  .catch((err) => console.log(err));

// EJS
app.use(expressLayouts);
app.set("view engine", "ejs");

// Express body parser
app.use(express.urlencoded({ extended: true }));

// Express session
app.use(
  session({
    secret: "secret",
    resave: true,
    saveUninitialized: true,
  })
);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Connect flash
app.use(flash());

// Global variables
app.use(function (req, res, next) {
  res.locals.success_msg = req.flash("success_msg");
  res.locals.error_msg = req.flash("error_msg");
  res.locals.error = req.flash("error");
  next();
});

// Routes
app.use("/", require("./routes/index.js"));
app.use("/users", require("./routes/users.js"));
