require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const soloSocket = require('./src/sockets/soloSocket');
const coopSocket = require('./src/sockets/coopSocket');

const connectDB = require('./config/db');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());

// ✅ add these
app.use("/", require("./routes/index"));


app.get('/ping', (req, res) => {
  res.json({ message: 'pong from main server' });
});

// Pass io to both game modules
soloSocket(io);
coopSocket(io);

connectDB();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server on ${PORT}`);
});
