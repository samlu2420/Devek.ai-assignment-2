const WebSocketServer = require('websocket').server;
const http = require('http');

const server = http.createServer((request, response) => {
    console.log('Received request for ' + request.url);
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
    } else if (data.type === 'join') {
        //join room
      roomCode = data.roomCode;
      userName = data.userName;
      if (!roomExists(roomCode)) {
        rooms[roomCode] = [];
      }
      rooms[roomCode].push(connection);
      console.log(`${userName} joined room: ${roomCode}`);

      // new user join broadcast
      rooms[roomCode].forEach((client) => {
        if (userName != null) {
            if (client !== connection) {
                client.sendUTF(JSON.stringify({
                type: 'broadcast',
                message: `${userName} has joined the room.`,
                userName: 'System'
                }));
            } 
        }
       
      });
    } else if (data.type === 'message' && roomCode) {
        //broadcast message
      console.log(`Broadcasting message from ${data.userName} in room ${roomCode}: ${data.message}`);
      rooms[roomCode].forEach((client) => {
        if (client !== connection) {
          client.sendUTF(JSON.stringify({ type: 'message', message: data.message, userName: data.userName }));
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

server.listen(8000, () => {
  console.log('WebSocket server is listening on port 8000');
});