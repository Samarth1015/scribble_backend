"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const config_1 = __importDefault(require("../config/config"));
const roomSize = 2;
const server = http_1.default.createServer(app_1.app);
let roomNo = 1;
let playerCount = 0;
const playerRoomRelatedInfo = [];
const io = new socket_io_1.Server(server, {
    path: "/api/socket",
    cors: {
        origin: "*", // allow frontend dev
    },
});
const joiningSocketTogroup = (socket, msg, roomNumber) => {
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
    socket.on("join_room_req", (msg) => {
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
    socket.on("chat_message", (msg) => {
        io.to(String(msg.roomNo)).emit("chat_message", msg);
    });
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
server.listen(config_1.default.port, () => {
    console.log(`Server listening on port ${config_1.default.port}`);
});
