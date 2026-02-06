import { io } from "socket.io-client";
import { BASE_URL } from "../config";

const SOCKET_URL = BASE_URL.replace("/api", ""); // Remove /api if present, though BASE_URL usually doesn't have it for root, adjusting logic to be safe.
// Actually, usually API_URL is http://localhost:5000. 
// If it was http://localhost:5000/api, we'd remove it. 
// Let's assume BASE_URL is the root host for now as per MERN defaults.

const socket = io(SOCKET_URL, {
    transports: ["websocket"],
});

export default socket;
