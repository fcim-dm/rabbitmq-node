require("dotenv").config();

/**
 * Server
 */
const express = require("express");
const app = express();

/**
 * Libs
 */
const bodyParser = require("body-parser");
const jackrabbit = require("jackrabbit");
const mongoose = require("mongoose");
const passport = require("passport");
const strategies = require("./auth/passport");
const localStrategy = require("passport-local").Strategy;
const { authorize } = require("./auth/index");

/**
 * ENV
 */
const RABBITMQ_URL = process.env.AMQP_URL || "amqp://guest:guest@localhost";
const RABBITMQ_QUEUE = process.env.TOPIC || "#";
const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost/pad";
const PORT = process.env.PORT || 5000;

/**
 * Models
 */
const Conversation = require("./models/Conversation");
const User = require("./models/User");
const Message = require("./models/Message");

/**
 * Connect RabbitMQ
 */
console.log("[RabbitMQ]: Connecting...");
const rabbit = jackrabbit(RABBITMQ_URL);
const exchange = rabbit.default();
var queue;

/**
 * Connect MongoDB
 */
console.log("[MongoDB]: Connecting...");
mongoose.connect(MONGODB_URL, {
  keepAlive: 1,
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

/**
 * Config server
 */
app.set("port", PORT);
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
passport.use("jwt", strategies.jwt);

/**
 * Endpoints
 */
app.get("/subscribe", function (req, res) {
  queue = exchange.queue({ name: RABBITMQ_QUEUE, durable: true });
  queue.consume(receiver);
  return res.end();
});

app.post("/conversation", authorize(), async (req, res, next) => {
  try {
    const conversation = await new Conversation(req.body).save();
    return res.status(200).json(conversation).end();
  } catch (error) {
    return res.status(400).json({ error }).end();
  }
});

app.post("/message", authorize(), async (req, res, next) => {
  try {
    const message = await new Message({
      ...req.body,
      user: req.user._id,
    }).save();

    /**
     * Public message in RabbitMQ
     */
    queue = exchange.queue({ name: RABBITMQ_QUEUE, durable: true });
    exchange.publish(message.toJSON(), { key: RABBITMQ_QUEUE });

    return res.status(200).json(message).end();
  } catch (error) {
    return res.status(400).json({ error }).end();
  }
});

app.post("/register", async (req, res, next) => {
  try {
    const user = await new User(req.body).save();
    return res.status(200).json(user).end();
  } catch (error) {
    return res.status(400).json({ error }).end();
  }
});

app.post("/login", async (req, res, next) => {
  try {
    const email = req.body?.email;
    const password = req.body?.password;
    const user = await User.findOne({ email });

    var valid = await user.isValidPassword(password);
    valid = await user.token();

    return res.status(200).json({ jwt: valid }).end();
  } catch (error) {
    return res.status(400).json({ error }).end();
  }
});

/**
 * Listen to RabbitMQ Queue
 * @param {*} data
 * @param {*} ack
 */
function receiver(data, ack) {
  console.log("Message received is: " + JSON.stringify(data));
  ack();
}

/**
 * Run Server
 */
app.listen(app.get("port"), function () {
  console.log("[Server]: Connecting...");
});
