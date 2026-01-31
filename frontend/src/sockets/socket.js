import { io } from "socket.io-client";
import API from "./api"; // Adjust path as needed

const SOCKET_URL = API.defaults.baseURL.replace("/api", "") || "http://localhost:5000";

const socket = io(SOCKET_URL, {
    transports: ["websocket"],
});

export default socket;
