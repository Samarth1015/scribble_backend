import { Server } from "http";
import { WebSocketServer } from "ws";
import { IncomingMessage } from "http";

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request: IncomingMessage, socket, head) => {
    if (request.url === "/api/socket") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
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
