import { useState, useRef } from "react";
import { w3cwebsocket as Socket } from "websocket";

const Login = ({ setUserName, setRoomCode, setWebSocketClient }) => {
  const [login, setLogin] = useState("");
  const [roomCode, setRoomCodeInput] = useState("");
  const [error, setError] = useState("");
  const client = useRef(null);

  // initialize websocket
  const initializeWebSocket = (onMessage) => {
    if (client.current) {
      client.current.close();
    }

    client.current = new Socket("ws://127.0.0.1:8000");

    client.current.onopen = () => {
      console.log("Connected to WebSocket server");
    };

    client.current.onmessage = (message) => {
      const data = JSON.parse(message.data);
      onMessage(data);
    };

    client.current.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setError("WebSocket connection failed");
    };

    client.current.onclose = () => {
      console.log("WebSocket Client Disconnected");
    };
  };

  // random number
  const generateRoomCode = () => {
    return Math.floor(10000 + Math.random() * 90000).toString();
  };

  // create a room
  const createRoom = () => {
    if (login.trim() === "") {
      setError("Username cannot be empty");
      return;
    }

    const newRoomCode = generateRoomCode();

    // initialize websocket inside createRoom
    initializeWebSocket((data) => {
      if (data.type === "createRoom" && data.success) {
        setRoomCode(newRoomCode);
        setUserName(login);
        setWebSocketClient(client.current);
      }
    });

    if (client.current.readyState === WebSocket.OPEN) {
      client.current.send(
        JSON.stringify({
          type: "createRoom",
          roomCode: newRoomCode,
          userName: login,
        })
      );
    } else {
      client.current.onopen = () => {
        client.current.send(
          JSON.stringify({
            type: "createRoom",
            roomCode: newRoomCode,
            userName: login,
          })
        );
      };
    }
  };

  // Join a room
  const joinRoom = () => {
    if (login.trim() === "") {
      setError("Username cannot be empty");
      return;
    }
    if (roomCode.trim().length !== 5 || isNaN(roomCode)) {
      setError("Room code must be a 5-digit number");
      return;
    }

    // Initialize WebSocket inside joinRoom
    initializeWebSocket((data) => {
      if (data.type === "checkRoom") {
        if (!data.exists) {
          setError("Room does not exist");
        } else {
          if (client.current.readyState === WebSocket.OPEN) {
            client.current.send(
              JSON.stringify({
                type: "join",
                roomCode,
                userName: login,
              })
            );
            setRoomCode(roomCode);
            setUserName(login);
            setWebSocketClient(client.current);
          } else {
            client.current.onopen = () => {
              client.current.send(
                JSON.stringify({
                  type: "join",
                  roomCode,
                  userName: login,
                })
              );
              setRoomCode(roomCode);
              setUserName(login);
            };
          }
        }
      }
    });

    // Send checkRoom request to WebSocket server
    if (client.current.readyState === WebSocket.OPEN) {
      client.current.send(
        JSON.stringify({
          type: "checkRoom",
          roomCode,
        })
      );
    } else {
      client.current.onopen = () => {
        client.current.send(
          JSON.stringify({
            type: "checkRoom",
            roomCode,
          })
        );
      };
    }
  };

  return (
    <div className="form">
      <input
        value={login}
        onChange={(e) => {
          setLogin(e.target.value);
          setError(""); // Clear error when user starts typing
        }}
        onKeyUp={(e) => e.key === "Enter" && joinRoom()}
        type="text"
        placeholder="Enter Username"
      />
      <input
        value={roomCode}
        onChange={(e) => {
          setRoomCodeInput(e.target.value);
          setError(""); // Clear error when user starts typing
        }}
        onKeyUp={(e) => e.key === "Enter" && joinRoom()}
        type="text"
        placeholder="Enter Room Code"
      />
      {error && <p className="error">{error}</p>}
      <button onClick={joinRoom}>Join Room</button>
      <button onClick={createRoom}>Create Room</button>
    </div>
  );
};

export default Login;