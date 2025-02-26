import React, { useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";

const App = () => {
  const [userName, setUserName] = useState("");
  const [roomCode, setRoomCode] = useState("");

  return (
    <div className="App">
      {!userName ? (
        <Login setUserName={setUserName} setRoomCode={setRoomCode} />
      ) : (
        <Chat userName={userName} roomCode={roomCode} />
      )}
    </div>
  );
};

export default App;