require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
let mongoose = require("mongoose");
let bodyParser = require("body-parser");
const dns = require("dns");
const checkValidUrl = require("./utils/checkValidUrl");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use("/public", express.static(`${process.cwd()}/public`));

app.get("/", function (req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// Connect to the database
mongoose.connect(process.env.MONGO_URI).then(() => {
  console.log("Connected to the database");
  console.log(mongoose.connection.db.databaseName);
  mongoose.connection.db
    .listCollections()
    .toArray()
    .then((collections) => {
      const collectionNames = collections.map((collection) => collection.name);
      console.log("Collection Names:", collectionNames);
    })
    .catch((err) => {
      console.error(err);
    });
});
//console.log(mongoose.connection.readyState);

const Schema = mongoose.Schema;

const urlSchema = new Schema({
  original_url: { type: String, required: true },
  short_url: { type: Number, required: true },
});

const Url = mongoose.model("Url", urlSchema);

// Your first API endpoint
app.get("/api/hello", function (req, res) {
  res.json({ greeting: "hello API" });
});

// URL Shortener Microservice
app.post("/api/shorturl", (req, res) => {
  const input_url = req.body.url;

  //check if the URL is valid
  if (checkValidUrl(input_url)) {
    const urlObject = new URL(input_url);

    dns.lookup(urlObject.hostname, (err) => {
      if (err) {
        res.json({ original_url: input_url, error: "invalid url" });
      } else {
        // check if the URL is already in the database
        Url.findOne({ original_url: input_url })
          .then((data) => {
            res.json({
              original_url: data.original_url,
              short_url: data.short_url,
            });
          })
          .catch((err) => {
            Url.countDocuments({}).then((count) => {
              const newUrl = new Url({
                original_url: input_url,
                short_url: count + 1,
              });
              newUrl
                .save()
                .then((data) => {
                  res.json({
                    original_url: data.original_url,
                    short_url: data.short_url,
                  });
                })
                .catch((err) => {
                  console.error(err);
                });
            });
            return false;
          });
      }
    });
  } else {
    res.json({ original_url: input_url, error: "invalid url" });
  }
});

app.get("/api/shorturl/:short_url", (req, res) => {
  console.log(req.params.short_url);
  console.log(typeof req.params.short_url);
  console.log(typeof Number(req.params.short_url));
  Url.findOne({ short_url: Number(req.params.short_url) }).then((data) => {
    res.redirect(data.original_url);
  });
});

app.listen(port, function () {
  console.log(`Listening on port ${port}`);
});
