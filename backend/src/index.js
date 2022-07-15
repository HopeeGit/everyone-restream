var express = require("express");
const mongoose = require("mongoose");
const ipBan = require("./models/ipban.js");
const axios = require("axios");

var app = express();

app.use(express.urlencoded({ extended: true }));

// Connect to database
mongoose.connect("mongodb://" + process.env.MONGO_INITDB_ROOT_USERNAME + ":" + process.env.MONGO_INITDB_ROOT_PASSWORD + "@database:27017/banlistdb", {});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error: "));
db.once("open", function () {
   console.log("Connected successfully to banlist database");
});

var currentclient = ""; // Current streamers IP as string
var someone_streaming = false;

var banlist = []  // Ban array holds ip values as strings
ipBan.find({}, function (err, result) {   // Fetch banlist from db
   if (err) {

   } else {
      console.log("Initial banlist: ");
      result.forEach(ban => {
         console.log(ban.ip);
         banlist.push(ban.ip)
      });
   }
}).lean();

// Endpoint for !ban from mod in chat
app.post("/ban", async function (req, res) {
   console.log("POST /ban from user: " + req.body.user);
   if (someone_streaming) {
      console.log("Banning IP " + currentclient);

      banlist.push(currentclient);
      const ban = new ipBan({
         ip: currentclient
      });

      try {
         await ban.save();
         res.status(200);
         res.send("Ban");
         return;
      } catch (error) {
         res.status(500).send(error);
         return;
      }
   }
   res.status(403);
   res.send("Nobody to ban");
})

// Endpoint for chatbot to check if stream is active
app.get("/streamactive", async (request, response) => {
   try {
      response.send(someone_streaming);
   } catch (error) {
      response.status(500).send(error);
   }
});

// Endpoint for !hop from regular user in chat
app.post("/hop", function (req, res) {
   console.log("POST /hop from user: " + req.body.user);
   res.status(200);
   res.send("Hop");
})


// Endpoint for !forcehop from mod in chat
app.post("/forcehop", function (req, res) {
   console.log("POST /forcehop from user: " + req.body.user);
   res.status(200);
   res.send("Forcehop");
})

// HTTP callback for rtmp-nginx-module onconnect
app.post("/connect", function (req, res) {
   if (req.body.app === "streamout") {
      res.status(200);
      res.send("OK");
      return;
   }

   if (someone_streaming) {
      res.status(403);
      res.send("Denied");
      return;
   }

   var onbanlist = false;

   // Check if connecting streamer is banned
   banlist.forEach(ban => {
      if (ban === req.body.addr) {
         onbanlist = true;
      }
   });

   if (onbanlist === true) {
      console.log("Banned client " + req.body.addr + " tried connecting.");
      res.status(403);
      res.send("Banned client");
      return;
   } else {
      someone_streaming = true;

      currentclient = req.body.addr;
      console.log("Setting currentclient to: " + currentclient);

      // Notify chatbot about new connection
      axios
         .get("http://chatbot-container:8081/streamerjoining")
         .then(res => {

         })
         .catch(error => {
            console.error(error);
         });

      res.status(200);
      res.send("OK");
      return;
   }
})

// HTTP callback for rtmp-nginx-module
app.post("/disconnect", function (req, res) {
   if (req.body.app === "streamout") {
      res.status(200);
      res.send("OK");
      return;
   }

   someone_streaming = false;

   res.status(200);
   res.send("OK");
})

var server = app.listen(8081, function () {
   var host = server.address().address
   var port = server.address().port

   console.log("Backend listening at http://%s:%s", host, port)
})