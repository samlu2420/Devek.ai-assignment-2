import { w3cwebsocket as Socket } from "websocket";
import { useState, useEffect, useRef } from "react";

const Chat = ({ userName, roomCode, webSocketClient }) => {
  const [myMessage, setMyMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const client = useRef(webSocketClient); // Use the passed WebSocket client

  useEffect(() => {
    // No need to create new connection, use the existing one
    if (!client.current) return;

    client.current.onmessage = (message) => {
      const data = JSON.parse(message.data);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          message: data.message,
          userName: data.userName,
          type: data.type,
        },
      ]);
    };

    // Fetch chat history when component mounts
    fetch(`http://localhost:3001/api/rooms/${roomCode}/history`)
      .then(response => response.json())
      .then(history => {
        setMessages(history);
      })
      .catch(error => console.error("Error fetching room history:", error));

    return () => {
      if (client.current) {
        client.current.onmessage = null;
      }
    };
  }, [roomCode]);

  const onSend = () => {
    if (myMessage.trim() === "") return; // Prevent sending empty messages
    if (client.current && client.current.readyState === WebSocket.OPEN) {
      const messageData = {
        type: "message",
        message: myMessage,
        userName,
        roomCode,
      };
      client.current.send(JSON.stringify(messageData));
      setMessages((prevMessages) => [...prevMessages, messageData]); // Display the sent message immediately
      setMyMessage("");
    } else {
      console.error("WebSocket not connected");
    }
  };

  return (
    <>
      <div className="title">Username: {userName}</div>
      <div className="room-code">Room Code: {roomCode}</div>
      <div className="messages">
      <div className="bottom form">
        <input
          type="text"
          value={myMessage}
          onChange={(e) => setMyMessage(e.target.value)}
          onKeyUp={(e) => e.key === "Enter" && onSend()}
          placeholder="Message"
        />
        <button onClick={onSend}>Send</button>
      </div>
      {messages
          .slice()
          .reverse()
          .map((message, key) => (
            <div
              key={key}
              className={`message ${
                message.type === "broadcast"
                  ? "broadcast"
                  : userName === message.userName
                  ? "flex-end"
                  : "flex-start"
              }`}
            >
              <div>
                <strong>{message.userName}:</strong> {message.message}
              </div>
            </div>
          ))}
      </div>
    </>
  );
};

export default Chat;