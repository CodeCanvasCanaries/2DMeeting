require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const users = {};

const socketToRoom = {};

function randomCoordinates() {
  const stageWidth = 1000;
  const stageHeight = 1000;
  const nodeWidth = 100;
  const nodeHeight = 100;

  // Generate a random x position.
  let randomXPosition =
    Math.floor(Math.random() * (stageWidth - nodeWidth)) + 1;

  // Generate a random y position.
  let randomYPosition =
    Math.floor(Math.random() * (stageHeight - nodeHeight)) + 1;
  const xString = randomXPosition + "px";
  const yString = randomYPosition + "px";
  return { x: xString, y: yString };
}

io.on("connection", (socket) => {
  socket.on("join-room", (roomID) => {
    const initialCoordinates = randomCoordinates();
    const newPeer = { id: socket.id, coordinates: initialCoordinates };
    socket.emit("your-welcome-package", newPeer);
    socket.join(roomID);

    // If room exists add user to room
    if (users[roomID]) {
      users[roomID].push(socket.id);
      // Else, create a new room and add the user
    } else {
      users[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    // Send the user existing-users who are already in the room
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

    socket.emit("existing-users", usersInThisRoom, initialCoordinates);
  });

  socket.on("stream-to-existing-users", (payload) => {
    io.to(payload.existingUserID).emit("user-joined", {
      signal: payload.signal,
      newUserID: payload.myID,
      coordinates: payload.myCoordinates,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.newUserID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
      coordinates: payload.myCoordinates,
    });
  });

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    socket.to(roomID).broadcast.emit("user-disconnected", socket.id);
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
    }
  });

  socket.on("update-coordinates", (x, y) => {
    const roomID = socketToRoom[socket.id];
    socket.to(roomID).broadcast.emit("user-moved", x, y, socket.id);
  });
});

server.listen(process.env.PORT || 8080, () =>
  console.log("server is running on port 8080")
);
