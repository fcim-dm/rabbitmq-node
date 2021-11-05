# rabbitmq-node
PAD L2

# Init
Make sure to have , `rabbitmq` , `node 14` , `mongodb` installed

# Configure .env
```
AMQP_URL='amqp://guest:guest@localhost'
TOPIC='#'
RABBITMQ_USER='guest'
RABBITMQ_PASSWORD='guest'
PORT=5000
MONGODB_HOST=mongodb://localhost/pad
JWT_SECRET=pad
JWT_EXP='7d'
```

# Start
```yarn dev```
