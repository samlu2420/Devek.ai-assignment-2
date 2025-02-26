const Redis = require("ioredis");
const cors = require("cors");
const express = require("express");
const { server: WebSocketServer } = require("websocket");
const http = require("http");

const server = http.createServer((request, response) => {
    console.log('Received request for ' + request.url);
});

// redis client
const redis = new Redis({
    host: "redis-18319.c322.us-east-1-2.ec2.redns.redis-cloud.com",
    port: 18319,
    password: "hicUmudlgVjZ5KjbP5DSl5a2LtqPHOXC",
  });

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});
redis.on("connect", () => {
  console.log("Connected to Redis");
});

// express app
const app = express();
const apiPort = 3001;
app.use(cors());

// Add new API endpoint for room history
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

const wsServer = new WebSocketServer({
  httpServer: server,
});

const rooms = {};

//random number
const generateRoomCode = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

const roomExists = (roomCode) => {
  return rooms.hasOwnProperty(roomCode);
};

wsServer.on('request', (request) => {
  const connection = request.accept(null, request.origin);
  let roomCode = null;
  let userName = null;

  connection.on('message', (message) => {
    const data = JSON.parse(message.utf8Data);

    //check to see what action needs to be taken
    if (data.type === 'checkRoom') {
        //check room
      const exists = roomExists(data.roomCode);
      connection.sendUTF(JSON.stringify({ type: 'checkRoom', exists }));
    } else if (data.type === 'createRoom') {
      // Handle room creation
      roomCode = data.roomCode;
      userName = data.userName;
      rooms[roomCode] = [connection];
      console.log(`Created room: ${roomCode} by ${userName}`);
      
      // Send success response back to client
      connection.sendUTF(JSON.stringify({ 
        type: 'createRoom', 
        success: true, 
        roomCode 
      }));

      // Create room message
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
      // Only send join message if it's not the room creator
      if (!roomExists(roomCode) || !rooms[roomCode].includes(connection)) {
        roomCode = data.roomCode;
        userName = data.userName;
        if (!roomExists(roomCode)) {
          rooms[roomCode] = [];
        }
        rooms[roomCode].push(connection);
        console.log(`${userName} joined room: ${roomCode}`);

        // new user join broadcast
        const joinMessage = {
          type: "message",
          message: `${userName} has joined the room.`,
          userName: "System",
          timestamp: new Date().toISOString(),
        };

        console.log("Storing in Redis:", JSON.stringify(joinMessage));

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
        //broadcast message
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

server.listen(8000, () => {
  console.log('WebSocket server is listening on port 8000');
});

app.listen(apiPort, () => {
    console.log(`Server is running at http://localhost:${apiPort}`);
  });