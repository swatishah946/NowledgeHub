import React, { useEffect, useRef, useState } from "react";
import useRoomChat from "../../hooks/useRoomChat";
import "./ChatRoom.css";

const GLOBAL_ROOM_ID = "study-group-1";

const formatDateSeparator = (dateString) => {
    if (!dateString) return null;
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) return "Today";
    if (messageDate.toDateString() === yesterday.toDateString()) return "Yesterday";
    return messageDate.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
};

const ChatRoom = () => {
    const [message, setMessage] = useState("");
    const { messages, connected, error, send, isOwn } = useRoomChat(GLOBAL_ROOM_ID);
    const chatContainerRef = useRef(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!message.trim() || !connected) return;
        send(message);
        setMessage("");
    };

    let lastMessageDate = null;

    return (
        <div className="chat-wrapper glass-card">
            <div className="chat-header">
                <h2>💬 Real-time Study Group</h2>
                <p>Messages are saved for 30 days. Connect and collaborate!</p>
                {error && <p style={{ color: "#ff6b6b" }}>{error}</p>}
            </div>

            <div className="chat-messages-container text-content-card" ref={chatContainerRef}>
                {messages.map((msg) => {
                    let showDateSeparator = false;
                    const currentMessageDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
                    if (currentMessageDate && currentMessageDate !== lastMessageDate) {
                        showDateSeparator = true;
                        lastMessageDate = currentMessageDate;
                    }
                    const own = isOwn(msg);

                    return (
                        <React.Fragment key={msg._id}>
                            {showDateSeparator && (
                                <div className="date-separator">
                                    <span>{formatDateSeparator(msg.createdAt)}</span>
                                </div>
                            )}
                            <div className={`message-row ${own ? "own-message" : "other-message"}`}>
                                <div className="message-bubble" style={msg.pending ? { opacity: 0.6 } : undefined}>
                                    <div className="message-sender">{own ? "You" : msg.sender}</div>
                                    <div className="message-text">{msg.text || msg.message}</div>
                                    <div className="message-time">
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                    placeholder={connected ? "Type your message..." : "Connecting..."}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={2000}
                    required
                    className="chat-input"
                />
                <button type="submit" disabled={!connected} className="btn-primary">
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatRoom;
