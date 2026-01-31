import React, { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import { BASE_URL } from "../../config";
import { getUserProfile } from '../../services/authService';
import { getRecentMessages } from '../../services/chatService';
import './ChatRoom.css'; // Import the new CSS file

const formatDateSeparator = (dateString) => {
    if (!dateString) return null;
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
        return 'Today';
    }
    if (messageDate.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    }
    return messageDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
};

const ChatRoom = () => {
    const [socket, setSocket] = useState(null);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);

    const chatContainerRef = useRef(null);
    const chatRoomId = "study-group-1";

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const { data } = await getUserProfile();
                setCurrentUser(data);
            } catch (error) {
                console.error("Failed to fetch user profile", error);
            }
        };
        fetchUserProfile();

        const fetchMessages = async () => {
            try {
                const recentMessages = await getRecentMessages(chatRoomId);
                setMessages(recentMessages);
            } catch (error) {
                console.error("Failed to fetch recent messages", error);
            }
        };
        fetchMessages();

        const newSocket = io(BASE_URL, {
            auth: {
                token: localStorage.getItem("token"),
            },
        });
        setSocket(newSocket);
        newSocket.emit("joinRoom", chatRoomId);
        newSocket.on("receiveMessage", (msg) => {
            setMessages((prev) => [...prev, msg]);
        });
        return () => {
            newSocket.disconnect();
        };
    }, []);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !socket) return;
        const newMsg = {
            text: message,
            sender: "You",
            createdAt: new Date().toISOString()
        };
        // Optimistic update
        setMessages((prev) => [...prev, newMsg]);
        socket.emit("sendMessage", { roomId: chatRoomId, message: message });
        setMessage("");
    };

    let lastMessageDate = null;

    return (
        <div className="chat-wrapper glass-card">
            <div className="chat-header">
                <h2>💬 Real-time Study Group</h2>
                <p>Messages are saved for 30 days. Connect and collaborate!</p>
            </div>

            <div className="chat-messages-container text-content-card" ref={chatContainerRef}>
                {messages.map((msg, idx) => {
                    let showDateSeparator = false;
                    const currentMessageDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;

                    if (currentMessageDate && currentMessageDate !== lastMessageDate) {
                        showDateSeparator = true;
                        lastMessageDate = currentMessageDate;
                    }

                    const isOwnMessage = currentUser && (msg.sender === currentUser.name || msg.sender === "You");

                    return (
                        <React.Fragment key={idx}>
                            {showDateSeparator && (
                                <div className="date-separator">
                                    <span>{formatDateSeparator(msg.createdAt)}</span>
                                </div>
                            )}
                            <div className={`message-row ${isOwnMessage ? 'own-message' : 'other-message'}`}>
                                <div className="message-bubble">
                                    <div className="message-sender">{isOwnMessage ? 'You' : msg.sender}</div>
                                    <div className="message-text">{msg.text || msg.message}</div>
                                    <div className="message-time">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            <form onSubmit={sendMessage} className="chat-input-form">
                <input
                    type="text"
                    value={message}
                    placeholder="Type your message..."
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    className="chat-input"
                />
                <button type="submit" disabled={!socket} className="btn-primary">
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatRoom;