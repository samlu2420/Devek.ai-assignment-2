const Redis = require("ioredis");
const cors = require("cors");
const express = require("express");
const { server: WebSocketServer } = require("websocket");
const http = require("http");
const path = require("path");
const open = require('open');

// Create Express app
const app = express();
const server = http.createServer(app);

// Redis client with environment variables
const redis = new Redis({
    host: process.env.REDIS_HOST || "redis-18319.c322.us-east-1-2.ec2.redns.redis-cloud.com",
    port: process.env.REDIS_PORT || 18319,
    password: process.env.REDIS_PASSWORD || "hicUmudlgVjZ5KjbP5DSl5a2LtqPHOXC",
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});
redis.on("connect", () => {
    console.log("Connected to Redis");
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'build')));

// WebSocket server
const wsServer = new WebSocketServer({
    httpServer: server,
});

const rooms = {};

const roomExists = (roomCode) => {
    return rooms.hasOwnProperty(roomCode);
};

wsServer.on('request', (request) => {
    const connection = request.accept(null, request.origin);
    let roomCode = null;
    let userName = null;

    connection.on('message', (message) => {
        const data = JSON.parse(message.utf8Data);

        if (data.type === 'checkRoom') {
            const exists = roomExists(data.roomCode);
            connection.sendUTF(JSON.stringify({ type: 'checkRoom', exists }));
        } else if (data.type === 'createRoom') {
            roomCode = data.roomCode;
            userName = data.userName;
            rooms[roomCode] = [connection];
            console.log(`Created room: ${roomCode} by ${userName}`);
            
            connection.sendUTF(JSON.stringify({ 
                type: 'createRoom', 
                success: true, 
                roomCode 
            }));

            const createMessage = {
                type: "message",
                message: `${userName} has created the room.`,
                userName: "System",
                timestamp: new Date().toISOString(),
            };

            redis.lpush(`room:${roomCode}`, JSON.stringify(createMessage))
                .then(() => console.log("Create message stored in Redis"))
                .catch((err) => console.error("Redis LPUSH error:", err));

        } else if (data.type === 'join') {
            if (!roomExists(roomCode) || !rooms[roomCode].includes(connection)) {
                roomCode = data.roomCode;
                userName = data.userName;
                if (!roomExists(roomCode)) {
                    rooms[roomCode] = [];
                }
                rooms[roomCode].push(connection);
                console.log(`${userName} joined room: ${roomCode}`);

                const joinMessage = {
                    type: "message",
                    message: `${userName} has joined the room.`,
                    userName: "System",
                    timestamp: new Date().toISOString(),
                };

                redis.lpush(`room:${roomCode}`, JSON.stringify(joinMessage))
                    .then(() => console.log("Join message stored in Redis"))
                    .catch((err) => console.error("Redis LPUSH error:", err));
                
                rooms[roomCode].forEach((client) => {
                    if (client !== connection) {
                        client.sendUTF(JSON.stringify(joinMessage));
                    }
                });
            }
        } else if (data.type === 'message' && roomCode) {
            const broadcastMessage = {
                type: "message",
                message: data.message,  
                userName: data.userName, 
                timestamp: new Date().toISOString(),
            };
            console.log(`Broadcasting message from ${data.userName} in room ${roomCode}: ${data.message}`);
            redis.lpush(`room:${roomCode}`, JSON.stringify(broadcastMessage))
                .then(() => console.log("Broadcast message stored in Redis"))
                .catch((err) => console.error("Redis LPUSH error:", err));
            rooms[roomCode].forEach((client) => {
                if (client !== connection) {
                    client.sendUTF(JSON.stringify(broadcastMessage));
                }
            });
        }
    });

    connection.on('close', () => {
        if (roomCode && rooms[roomCode]) {
            rooms[roomCode] = rooms[roomCode].filter((client) => client !== connection);
            if (rooms[roomCode].length === 0) {
                delete rooms[roomCode];
            }
            console.log(`User ${userName} left room: ${roomCode}`);
        }
    });
});

// API Routes
app.get("/api/rooms/:roomCode/history", async (req, res) => {
    try {
        const roomCode = req.params.roomCode;
        const messages = await redis.lrange(`room:${roomCode}`, 0, -1);
        const parsedMessages = messages.map(msg => JSON.parse(msg));
        res.json(parsedMessages);
    } catch (error) {
        console.error("Error fetching room history:", error);
        res.status(500).json({ error: "Failed to fetch room history" });
    }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
    if (process.env.NODE_ENV !== 'production') {
        open(`http://localhost:${PORT}`);
    }
}); 