import { app } from "./app";
import http from "http";
import { Server, Socket } from "socket.io";
import config from "../config/config";
import { Player } from "../types/player";

const roomSize = 2;

const server = http.createServer(app);

let roomNo = 1;
let playerCount = 0;

const playerRoomRelatedInfo: Player[][] = [];

const io = new Server(server, {
  path: "/api/socket",
  cors: {
    origin: "*", // allow frontend dev
  },
});
const joiningSocketTogroup = (
  socket: Socket,
  msg: { name: String },
  roomNumber: number
) => {
  socket.join(String(roomNumber));
  // console.log("----dif", socket.id);
  setTimeout(() => {
    io.to(String(roomNumber)).emit("res_join_room_req", {
      roomNo: roomNumber,
      name: msg.name,
      socketId: socket.id,
    });
  }, 1000);
};

io.on("connection", (socket) => {
  // drawing socket connection
  socket.on("draw", (data) => {
    // console.log(data.roomNo);
    io.to(String(data.roomNo)).emit("draw", data);
  });

  // join room req
  socket.on("join_room_req", (msg: { name: String }) => {
    let addedToRoom = false;

    // Try to add to an existing room with space
    for (let i = 0; i < playerRoomRelatedInfo.length; i++) {
      if (playerRoomRelatedInfo[i].length < roomSize) {
        playerRoomRelatedInfo[i].push({
          name: msg.name,
          socketId: socket.id,
          roomNo: i + 1, // +1 to avoid 0-based room number
        });
        roomNo = i + 1;
        joiningSocketTogroup(socket, { name: msg.name }, roomNo);
        addedToRoom = true;
        break;
      }
    }

    // If no suitable room is found, create a new room
    if (!addedToRoom) {
      const newRoomIndex = playerRoomRelatedInfo.length;
      playerRoomRelatedInfo.push([
        {
          name: msg.name,
          socketId: socket.id,
          roomNo: newRoomIndex + 1,
        },
      ]);
      roomNo = newRoomIndex + 1;
      joiningSocketTogroup(socket, { name: msg.name }, roomNo);
    }
  });

  //chat functionality
  socket.on(
    "chat_message",
    (msg: { name: string; roomNo: number; message: string }) => {
      io.to(String(msg.roomNo)).emit("chat_message", msg);
    }
  );

  socket.on("disconnect", () => {
    // console.log(socket.id, "got disconnected");

    for (let i = 0; i < playerRoomRelatedInfo.length; i++) {
      const room = playerRoomRelatedInfo[i];
      const index = room.findIndex((player) => player.socketId === socket.id);

      if (index !== -1) {
        const removedPlayer = room.splice(index, 1)[0];

        // console.log(
        //   `Removed ${removedPlayer.name} from room ${removedPlayer.roomNo}`
        // );

        io.to(String(removedPlayer.roomNo)).emit("player_left", {
          name: removedPlayer.name,
          roomNo: removedPlayer.roomNo,
        });

        if (room.length === 0) {
          playerRoomRelatedInfo.splice(i, 1);
          // console.log(`Room ${removedPlayer.roomNo} is now empty and removed`);
        }

        break;
      }
    }
  });
});

server.listen(config.port, () => {
  console.log(`Server listening on port ${config.port}`);
});
