require("dotenv").config();
const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const users = {};

const socketToRoom = {};

io.on("connection", (socket) => {
  socket.on("join-room", (payload) => {
    const roomID = payload.roomID;
    const initialCoordinates = payload.initialCoordinates;
    const newPeer = { id: socket.id, coordinates: initialCoordinates };
    socket.emit("your-welcome-package", newPeer);
    //socket.join(roomID);

    // If room exists add user to room
    if (users[roomID]) {
      users[roomID].push(newPeer);
      // Else, create a new room and add the user
    } else {
      users[roomID] = [newPeer];
    }
    socketToRoom[socket.id] = roomID;
    // Send the user the existing users who are already in the room along with their coordinates
    const usersInThisRoom = users[roomID].filter(
      (user) => user.id !== socket.id
    );

    socket.emit("existing-users", usersInThisRoom);
  });

  socket.on("stream-to-existing-users", (payload) => {
    io.to(payload.existingUserID).emit("user-joined", {
      signal: payload.signal,
      newUserID: payload.myID,
      coordinates: payload.myCoordinates, // Sending myCoordinates to the existing users
    });
  });

  socket.on("returning-signal-to-new-users", (payload) => {
    io.to(payload.newUserID).emit(
      "receiving-returned-signal-from-existing-user",
      {
        signal: payload.signal,
        id: socket.id,
        //  coordinates: payload.myCoordinates, // Sending myCoordinates to the newly joined user
      }
    );
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
