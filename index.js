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
const { authorize } = require("./auth/index");
const http = require("http").Server(app);
const io = require("socket.io")(http, {
  path: "/websockets",
  pingTimeout: 180000,
  autoConnect: true,
  pingInterval: 25000,
  cors: {
    origin: "*",
  },
});

/**
 * ENV
 */
const RABBITMQ_URL = process.env.AMQP_URL || "amqp://guest:guest@localhost";
const MONGODB_URL = process.env.MONGODB_URL || "mongodb://localhost/pad";
const PORT = process.env.PORT || 5000;

/**
 * Models
 */
const Conversation = require("./models/Conversation");
const User = require("./models/User");
const Message = require("./models/Message");
const Conversations = new Map();
const SocketsConversations = new Map();

/**
 * Connect RabbitMQ
 */
console.log("[RabbitMQ]: Connecting...");
const rabbit = jackrabbit(RABBITMQ_URL);
const exchange = rabbit.default();

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
app.use(express.static(`${__dirname}/app`));
app.use(bodyParser.json({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(passport.initialize());
passport.use("jwt", strategies.jwt);

/**
 * Upsert conversation
 * @param {*} title
 * @returns
 */
const up_conversation = async (title) => {
  var conversation = await Conversation.findOne({ title });

  if (!conversation) conversation = await new Conversation({ title }).save();

  /**
   * Make queue
   */
  const qname = `conversation@${conversation._id.toString()}`;
  exchange.queue({
    name: qname,
    durable: true,
  });

  /**
   * Consume / Subscribe to queue
   */
  const queue = exchange.queue({ name: qname, durable: true });
  queue.consume(receiver);

  return conversation;
};

/**
 * Endpoints
 */
app.get(
  "/conversation/:title/messages",
  authorize(),
  async (req, res, next) => {
    try {
      const conversation = await up_conversation(req.params.title);
      const messages = await Message.find({ conversation })
        .populate("user")
        .sort({
          created_at: -1,
        });

      return res.status(200).json({ conversation, messages }).end();
    } catch (error) {
      return res.status(400).json({ error }).end();
    }
  }
);

app.post("/message", authorize(), async (req, res, next) => {
  try {
    const message = await new Message({
      ...req.body,
      user: req.user._id,
    })
      .save()
      .then((doc) => doc.populate(["user", "conversation"]));

    /**
     * Publish message as JSON string
     */
    const qname = `conversation@${message.conversation._id.toString()}`;
    exchange.publish(JSON.stringify(message.toJSON()), { key: qname });

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

    return res.status(200).json({ jwt: valid, user }).end();
  } catch (error) {
    return res.status(400).json({ error }).end();
  }
});

/**
 * Socket
 */
const _socket = () => {
  /**
   * Handle socket connection
   */
  try {
    io.use(async (socket, next) => {
      const query = socket.handshake.query;
      const conversation = query?.conversation;
      const current = Conversations.get(conversation);
      if (!current) Conversations.set(conversation, []);
      SocketsConversations.set(socket.id, conversation);

      return next();
    }).on("connection", async (socket) => {
      console.log(`[Socket]: Client connection ${socket.id}`);

      /**
       * Add connections
       */
      const conversation = SocketsConversations.get(socket.id);
      const current = Conversations.get(conversation);
      current.push(socket.id);

      /**
       * Socket diconnected remove user
       */
      socket.on("disconnect", async () => {
        /**
         * Clear connections
         */
        SocketsConversations.delete(socket.id);
        var index = current.indexOf(socket.id);
        if (index !== -1) current.splice(index, 1);
        console.log(`[Socket]: Client disconnection ${socket.id}`);
      });
    });

    console.log(`[Socket]: Successfully Connected`);
  } catch (error) {
    console.log(
      `[Socket]: Unsuccessfully connected with error: ${error.message}`
    );
  }
};

/**
 * Listen to RabbitMQ queue messages
 * @param {*} data
 * @param {*} ack
 */
function receiver(data, ack) {
  ack(); // Acknowledgement of RabbitMQ message

  /**
   * Convert json string to json object
   */
  const object = JSON.parse(data);
  if (!object?.conversation?.title) return;

  const current = Conversations.get(object?.conversation?.title);
  if (!current) return;

  current.forEach((e) => {
    io.to(e).emit("message", object);
  });
}

/**
 * Run Server
 */
_socket();
http.listen(app.get("port"), () =>
  console.log(`[Server]: Server started on port (${app.get("port")})`)
);
