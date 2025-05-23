"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupWebSocket = setupWebSocket;
const ws_1 = require("ws");
function setupWebSocket(server) {
    const wss = new ws_1.WebSocketServer({ noServer: true });
    server.on("upgrade", (request, socket, head) => {
        if (request.url === "/api/socket") {
            wss.handleUpgrade(request, socket, head, (ws) => {
                wss.emit("connection", ws, request);
            });
        }
        else {
            socket.destroy();
        }
    });
    wss.on("connection", (ws) => {
        console.log("Client connected via /api/socket");
        ws.on("message", (message) => {
            console.log("Received:", message.toString());
            ws.send(`Echo from server: ${message}`);
        });
        ws.on("close", () => {
            console.log("Client disconnected from /api/socket");
        });
    });
}
