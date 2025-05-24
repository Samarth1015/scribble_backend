"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// E:\scribble_backend\src\server.ts
const app_1 = require("./app");
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const config_1 = __importDefault(require("../config/config"));
const roomSize = 3;
const gameRooms = [];
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
function generateRandomWords() {
    const wordBank = ["apple", "banana", "car", "dog", "elephant"];
    const shuffled = wordBank.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3); // Let drawer choose from 3 options
}
function resetGameRoom(gameRoom) {
    // Reset game state
    gameRoom.wordToGuess = "";
    gameRoom.guessedCorrectly.clear();
    // Rotate to next drawer
    gameRoom.currentDrawerIndex =
        (gameRoom.currentDrawerIndex + 1) % gameRoom.players.length;
    // Start new round
    const drawer = gameRoom.players[gameRoom.currentDrawerIndex];
    io.to(String(drawer.socketId)).emit("choose_word", {
        words: generateRandomWords(),
    });
    io.to(String(gameRoom.roomNo)).emit("game_ready", {
        drawer: drawer.name,
        sockeId: drawer.socketId,
    });
}
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
                if (playerRoomRelatedInfo[i].length === roomSize) {
                    console.log("game starting");
                    const roomNo = i + 1;
                    const playersInRoom = [...playerRoomRelatedInfo[i]];
                    const randomDrawerIndex = Math.floor(Math.random() * playersInRoom.length);
                    const newGameRoom = {
                        roomNo,
                        players: [...playerRoomRelatedInfo[i]],
                        currentDrawerIndex: randomDrawerIndex,
                        wordToGuess: "",
                        guessedCorrectly: new Set(),
                        points: new Map(),
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
            const drawerSocketId = gameRoom.players[gameRoom.currentDrawerIndex].socketId;
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
    // socket.on("correct_guess", ({ socketId, roomNo }) => {
    //   const gameRoom = gameRooms.find((room) => room.roomNo === roomNo);
    //   console.log("calling insdie correct guess", gameRoom);
    //   if (gameRoom) {
    //     gameRoom.guessedCorrectly.add(socketId);
    //     console.log("--->", gameRoom.guessedCorrectly.size);
    //     if (gameRoom.guessedCorrectly.size === gameRoom.players.length - 1) {
    //       io.to(String(roomNo)).emit("game_over", { points: gameRoom.points });
    //     } else {
    //       gameRoom.points.set(socketId, (gameRoom.points.get(socketId) || 0) + 1);
    //     }
    //   }
    // });
    //chat functionality
    socket.on("chat_message", (msg) => {
        if (msg.isCorrect) {
            const gameRoom = gameRooms.find((room) => room.roomNo === msg.roomNo);
            if (gameRoom) {
                gameRoom.guessedCorrectly.add(socket.id);
                const currentPoints = gameRoom.points.get(socket.id) || 0;
                gameRoom.points.set(socket.id, currentPoints + 1);
                // Emit points update to all players in the room
                io.to(String(msg.roomNo)).emit("points_update", {
                    points: gameRoom.points,
                });
                if (gameRoom.guessedCorrectly.size === gameRoom.players.length - 1) {
                    console.log("points", gameRoom.points);
                    io.to(String(msg.roomNo)).emit("game_over", {
                        points: gameRoom.points,
                    });
                    // Reset the game room for next round
                    resetGameRoom(gameRoom);
                }
            }
        }
        io.to(String(msg.roomNo)).emit("chat_message", msg);
    });
    socket.on("disconnect", () => {
        // Find and remove player from playerRoomRelatedInfo
        for (let i = 0; i < playerRoomRelatedInfo.length; i++) {
            const room = playerRoomRelatedInfo[i];
            const index = room.findIndex((player) => player.socketId === socket.id);
            if (index !== -1) {
                const removedPlayer = room.splice(index, 1)[0];
                const roomNo = removedPlayer.roomNo;
                // Remove player from game room
                const gameRoom = gameRooms.find((room) => room.roomNo === roomNo);
                if (gameRoom) {
                    // Remove player from game room
                    const playerIndex = gameRoom.players.findIndex((player) => player.socketId === socket.id);
                    if (playerIndex !== -1) {
                        gameRoom.players.splice(playerIndex, 1);
                        // If the drawer disconnected, assign a new drawer
                        if (playerIndex === gameRoom.currentDrawerIndex) {
                            if (gameRoom.players.length > 0) {
                                gameRoom.currentDrawerIndex = 0; // Set first remaining player as drawer
                                const newDrawer = gameRoom.players[0];
                                io.to(String(newDrawer.socketId)).emit("choose_word", {
                                    words: generateRandomWords(),
                                });
                            }
                        }
                        // Remove player from points and guessed correctly
                        gameRoom.points.delete(socket.id);
                        gameRoom.guessedCorrectly.delete(socket.id);
                        // If only one player remains, end the game
                        if (gameRoom.players.length <= 1) {
                            io.to(String(roomNo)).emit("game_over", {
                                points: gameRoom.points,
                                message: "Game ended due to insufficient players",
                            });
                            // Remove the game room
                            const gameRoomIndex = gameRooms.findIndex((room) => room.roomNo === roomNo);
                            if (gameRoomIndex !== -1) {
                                gameRooms.splice(gameRoomIndex, 1);
                            }
                        }
                    }
                }
                io.to(String(roomNo)).emit("player_left", {
                    name: removedPlayer.name,
                    roomNo: roomNo,
                });
                if (room.length === 0) {
                    playerRoomRelatedInfo.splice(i, 1);
                }
                break;
            }
        }
    });
});
server.listen(config_1.default.port, () => {
    console.log(`Server listening on port ${config_1.default.port}`);
});
