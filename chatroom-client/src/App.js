import React, { useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";

const App = () => {
  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [webSocketClient, setWebSocketClient] = useState(null);

  return (
    <div className="App">
      {!userName ? (
        <Login 
          setUserName={setUserName} 
          setRoomCode={setRoomCode} 
          setWebSocketClient={setWebSocketClient}
        />
      ) : (
        <Chat 
          userName={userName} 
          roomCode={roomCode} 
          webSocketClient={webSocketClient}
        />
      )}
    </div>
  );
};

export default App;