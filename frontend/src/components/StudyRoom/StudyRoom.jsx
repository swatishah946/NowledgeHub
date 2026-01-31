import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { getToken } from '../../utils/authUtils';
import { Timer } from './Timer';
import { BASE_URL } from '../../config';
import { getUserProfile } from '../../services/authService';
import { createChatRoom, joinChatRoom } from '../../services/chatService';

const StudyRoom = () => {
    const [socket, setSocket] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    
    // Room State
    const [isInRoom, setIsInRoom] = useState(false);
    const [roomDetails, setRoomDetails] = useState(null); // { _id, name, code }
    const [joinCode, setJoinCode] = useState('');
    const [newRoomName, setNewRoomName] = useState('');
    const [error, setError] = useState('');

    const chatContainerRef = useRef(null);

    // 1. Fetch User Profile on Load
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
    }, []);

    // 2. Socket Connection (Only happens when roomDetails is set)
    useEffect(() => {
        if (!roomDetails) return;

        const newSocket = io(BASE_URL, {
            auth: { token: getToken() }
        });
        setSocket(newSocket);

        // Join the specific dynamic room ID
        newSocket.emit('joinRoom', roomDetails._id);
        
        newSocket.on('receiveMessage', (msg) => {
            setMessages(prev => [...prev, msg]);
        });

        return () => newSocket.disconnect();
    }, [roomDetails]);

    // 3. Auto-scroll chat
    useEffect(() => {
        if (chatContainerRef.current) {
            const { scrollHeight, clientHeight } = chatContainerRef.current;
            chatContainerRef.current.scrollTop = scrollHeight - clientHeight;
        }
    }, [messages]);

    // HANDLERS
    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const result = await createChatRoom(newRoomName || "Study Room");
            setRoomDetails(result.room);
            setIsInRoom(true);
            setMessages([]); // Clear previous messages
        } catch (err) {
            setError("Failed to create room.");
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const result = await joinChatRoom(joinCode.trim().toUpperCase());
            setRoomDetails(result.room);
            setIsInRoom(true);
            setMessages([]); // Clear previous messages
        } catch (err) {
            setError("Invalid Room Code or connection failed.");
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (input.trim() && socket && roomDetails) {
            const newMsg = {
                text: input,
                sender: 'You',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };
            setMessages(prev => [...prev, newMsg]);
            
            // Send dynamic roomId
            socket.emit('sendMessage', { roomId: roomDetails._id, message: input });
            setInput('');
        }
    };

    const handleLeaveRoom = () => {
        if (socket) socket.disconnect();
        setSocket(null);
        setIsInRoom(false);
        setRoomDetails(null);
        setJoinCode('');
        setNewRoomName('');
    };

    // RENDER: LOBBY View
    if (!isInRoom) {
        return (
            <div className="card" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center' }}>
                <h2>📚 Enter Study Room</h2>
                <p>Join an existing group or create a new one.</p>
                
                {error && <p style={{ color: 'red' }}>{error}</p>}

                <div style={{ marginTop: '2rem' }}>
                    <h3>Join a Room</h3>
                    <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <input 
                            type="text" 
                            placeholder="Enter 6-digit Code" 
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            style={{ width: '150px', textAlign: 'center', textTransform: 'uppercase' }}
                            required
                        />
                        <button type="submit">Join</button>
                    </form>
                </div>

                <div style={{ margin: '2rem 0', borderTop: '1px solid #eee', paddingTop: '2rem' }}>
                    <h3>Create New Room</h3>
                    <form onSubmit={handleCreateRoom} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <input 
                            type="text" 
                            placeholder="Room Name (e.g., Physics)" 
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            required
                        />
                        <button type="submit" style={{ backgroundColor: '#28a745' }}>Create</button>
                    </form>
                </div>
            </div>
        );
    }

    // RENDER: CHAT View
    return (
        <>
            <Timer />
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>{roomDetails.name}</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                            Room Code: <strong style={{ color: '#007bff', fontSize: '1.1rem' }}>{roomDetails.code}</strong>
                        </p>
                    </div>
                    <button onClick={handleLeaveRoom} style={{ padding: '5px 10px', fontSize: '0.8rem', backgroundColor: '#dc3545' }}>
                        Leave Room
                    </button>
                </div>

                <div 
                    ref={chatContainerRef}
                    style={{ 
                        height: '300px', 
                        overflowY: 'scroll', 
                        border: '1px solid #ccc', 
                        padding: '10px', 
                        marginBottom: '1rem', 
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: '#f9f9f9'
                    }}
                >
                    {messages.length === 0 && <p style={{ textAlign: 'center', color: '#888' }}>No messages yet. Share the code <b>{roomDetails.code}</b> to invite others!</p>}
                    
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{ margin: '0.5rem 0', textAlign: currentUser && msg.sender === 'You' ? 'right' : 'left' }}>
                            <div style={{ 
                                display: 'inline-block', 
                                padding: '8px 12px', 
                                borderRadius: '15px', 
                                backgroundColor: currentUser && msg.sender === 'You' ? '#ffc0cb' : '#90D5FF',
                                border: '1px solid #ddd'
                            }}>
                                <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px' }}>
                                    {currentUser && msg.sender === 'You' ? 'You' : msg.sender}
                                </strong>
                                {msg.text || msg.message}
                                <span style={{ fontSize: "0.7rem", color: "gray", marginLeft: '8px' }}>
                                    {msg.timestamp}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
                
                <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend(e)}
                        style={{ flexGrow: 1 }}
                        placeholder="Type your message..."
                    />
                    <button type="submit" disabled={!socket}>Send</button>
                </form>
            </div>
        </>
    );
};

export default StudyRoom;