// E:\scribble_backend\src\server.ts
import { app } from "./app";
import http from "http";
import { Server, Socket } from "socket.io";
import config from "../config/config";
import { Player } from "../types/player";
import { GameRoom } from "../types/gameroom";

const roomSize = 3;
const gameRooms: GameRoom[] = [];

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
function generateRandomWords(): string[] {
  const wordBank = ["apple", "banana", "car", "dog", "elephant"];
  const shuffled = wordBank.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 3); // Let drawer choose from 3 options
}

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
        if (playerRoomRelatedInfo[i].length === roomSize) {
          console.log("game starting");
          const roomNo = i + 1;
          const playersInRoom = [...playerRoomRelatedInfo[i]];
          const randomDrawerIndex = Math.floor(
            Math.random() * playersInRoom.length
          );
          const newGameRoom: GameRoom = {
            roomNo,
            players: [...playerRoomRelatedInfo[i]],
            currentDrawerIndex: randomDrawerIndex,
            wordToGuess: "",
            guessedCorrectly: new Set(),
          };

          gameRooms.push(newGameRoom);

          const drawer = newGameRoom.players[newGameRoom.currentDrawerIndex];
          setTimeout(() => {
            io.to(String(drawer.socketId)).emit("choose_word", {
              words: generateRandomWords(),
            });

            io.to(String(roomNo)).emit("game_ready", {
              drawer: drawer.name,
              sockeId: drawer.socketId,
            });
          }, 2000);
        }

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

  socket.on("word_chosen", ({ roomNo, word }) => {
    const gameRoom = gameRooms.find((room) => room.roomNo === roomNo);

    if (gameRoom) {
      gameRoom.wordToGuess = word;

      const drawerSocketId =
        gameRoom.players[gameRoom.currentDrawerIndex].socketId;
      gameRoom.players.forEach((player) => {
        if (player.socketId !== drawerSocketId) {
          console.log(player.socketId);
          io.to(String(player.socketId)).emit("game_start", {
            drawer: gameRoom.players[gameRoom.currentDrawerIndex].name,
          });
        }
      });

      // Notify drawer that the round has started
      io.to(String(roomNo)).emit("round_started", {
        word,
      });
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
