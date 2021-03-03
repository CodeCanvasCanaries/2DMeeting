import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const PORT = process.env.PORT || 8080;
const app = express();
app.enable("trust proxy");
const server = createServer(app);
const io = new Server(server);

const users = {};
const socketToRoom = {};

io.on("connection", (socket) => {
  socket.on("join-room", (roomID) => {
    socket.emit("yourId", socket.id);
    socket.join(roomID);
    socket.to(roomID).broadcast.emit("user-connected", socket.id);

    // If room exists add user to room
    if (users[roomID]) {
      users[roomID].push(socket.id);
      // Else, create a new room and add the user
    } else {
      users[roomID] = [socket.id];
    }

    socketToRoom[socket.id] = roomID;
    // Send the user all users currently in the room they are joining
    const usersInThisRoom = users[roomID].filter((id) => id !== socket.id);

    socket.emit("existing-users", usersInThisRoom);
  });

  socket.on("disconnect", () => {
    const roomID = socketToRoom[socket.id];
    socket.to(roomID).broadcast.emit("user-disconnected", socket.id);

    let room = users[roomID];
    // Update the users in the room
    if (room) {
      room = room.filter((id) => id !== socket.id);
      users[roomID] = room;
      ß;
    }
  });

  socket.on("update-coordinates", (x, y) => {
    const roomID = socketToRoom[socket.id];
    socket.to(roomID).broadcast.emit("user-moved", x, y, socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`App listening on port ${PORT}`);
});
