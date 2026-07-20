const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const QueryRouter = require('./database/query');
const ChatRouter = require('./database/chat');
const http = require('http');
const { Server } = require('socket.io');

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        credentials: true
    }
});

app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE']
}));

const PORT = 8080;

app.use('/database', QueryRouter);
app.use('/chat', ChatRouter);

app.all('/', (req, res) => {
    res.json({
        message: 'Server is responding correctly'
    });
});

io.on('connection', (socket) => {
    console.log("Connected:", socket.id);
    socket.on('send-message', (data) => {
        socket.broadcast.emit('get-message', data);
    })
    socket.on("disconnect", () => {
        console.log("Disconnected:", socket.id);
    });
})

server.listen(PORT, () => {
    console.log(`Server runing on http://localhost:${PORT}`)
});