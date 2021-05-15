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
var chatUserModule = require("./module/userchatsmodule");

// Passport Config
require("./config/passport")(passport);

// DB Config
const db = require("./config/keys").mongoURI;

// Connect to MongoDB and socket.io
mongoose
  .connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("MongoDB Connected");

    io.on("connection", (socket) => {
      MongoClient.connect(db, { useUnifiedTopology: true }, function (err, db) {
        var dbo = db.db("agProg");
        //let userChats = dbo.collection("userchats");
        let jsRoom = dbo.collection("jschats");
        let pyRoom = dbo.collection("pychats");
        let chat = dbo.collection("chats");
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

        /*
        userChats
          .find({
            senderId: chatUserModule.getSender(),
            receiverId: chatUserModule.getReceiver(),
          })
          .limit(100)
          .sort({ _id: 1 })
          .toArray(function (err, res) {
            if (err) {
              throw err;
            }

            socket.emit("outputUser", res);
          });

        socket.on("inputUser", (data) => {
          let senderUserId = data.sendenId;
          let receiverUserId = data.receiverId;
          let name = data.name;
          let message = data.message;
          chatUserModule.init(senderUserId, receiverUserId);
          userChats.insertOne(
            {
              senderId: senderUserId,
              receiverId: receiverUserId,
              name: name,
              message: message,
            },
            function () {
              io.sockets.emit("outputUser", [data]);
            }
          );
        });*/
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
