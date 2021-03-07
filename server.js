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
  socket.on("join room", (roomID) => {
    if (users[roomID]) {
      const length = users[roomID].length;
      if (length === 4) {
        socket.emit("room full");
        return;
      }
      users[roomID].push(socket.id);
    } else {
      users[roomID] = [socket.id];
    }
    socketToRoom[socket.id] = roomID;
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

    socket.emit("all users", usersInThisRoom);
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    let room = users[roomID];
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
    }
  });
});

server.listen(process.env.PORT || 8080, () =>
  console.log("server is running on port 8080")
);

// socket.on("join-room", (roomID) => {
//   socket.emit("yourId", socket.id);
//   socket.join(roomID);
//   socket.to(roomID).broadcast.emit("user-connected", socket.id);

//   // If room exists add user to room
//   if (users[roomID]) {
//     users[roomID].push(socket.id);
//     // Else, create a new room and add the user
//   } else {
//     users[roomID] = [socket.id];
//   }

//   socketToRoom[socket.id] = roomID;
//   // Send the user all users currently in the room they are joining
//   const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

//   socket.emit("existing-users", usersInThisRoom);
// });

// socket.on("disconnect", () => {
//   const roomID = socketToRoom[socket.id];
//   socket.to(roomID).broadcast.emit("user-disconnected", socket.id);

//   let room = users[roomID];
//   // Update the users in the room
//   if (room) {
//     room = room.filter((id) => id !== socket.id);
//     users[roomID] = room;
//     ß;
//   }
// });

// socket.on("update-coordinates", (x, y) => {
//   const roomID = socketToRoom[socket.id];
//   socket.to(roomID).broadcast.emit("user-moved", x, y, socket.id);
// });
