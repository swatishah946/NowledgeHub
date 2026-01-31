import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import { setupSockets } from "./config/socketConfig.js";

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*" }
});
setupSockets(io);

server.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
});
