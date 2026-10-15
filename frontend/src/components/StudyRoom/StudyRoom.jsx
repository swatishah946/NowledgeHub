import React, { useEffect, useState, useRef } from 'react';
import { Timer } from './Timer';
import { createChatRoom, joinChatRoom } from '../../services/chatService';
import useRoomChat from '../../hooks/useRoomChat';

const errorText = (err, fallback) => err?.response?.data?.message || err?.response?.data?.error || fallback;

const StudyRoom = () => {
    const [roomDetails, setRoomDetails] = useState(null); // { _id, name, code }
    const [joinCode, setJoinCode] = useState('');
    const [newRoomName, setNewRoomName] = useState('');
    const [input, setInput] = useState('');
    const [lobbyError, setLobbyError] = useState('');
    const [busy, setBusy] = useState(false);

    const { messages, connected, error, send, isOwn } = useRoomChat(roomDetails?._id);
    const chatContainerRef = useRef(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    const handleCreateRoom = async (e) => {
        e.preventDefault();
        setLobbyError('');
        setBusy(true);
        try {
            setRoomDetails(await createChatRoom(newRoomName.trim() || 'Study Room'));
        } catch (err) {
            setLobbyError(errorText(err, 'Failed to create room.'));
        } finally {
            setBusy(false);
        }
    };

    const handleJoinRoom = async (e) => {
        e.preventDefault();
        setLobbyError('');
        setBusy(true);
        try {
            setRoomDetails(await joinChatRoom(joinCode.trim().toUpperCase()));
        } catch (err) {
            setLobbyError(errorText(err, 'Invalid room code or connection failed.'));
        } finally {
            setBusy(false);
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim() || !connected) return;
        send(input);
        setInput('');
    };

    const handleLeaveRoom = () => {
        setRoomDetails(null);
        setJoinCode('');
        setNewRoomName('');
    };

    // LOBBY view
    if (!roomDetails) {
        return (
            <div className="card" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center' }}>
                <h2>📚 Enter Study Room</h2>
                <p>Join an existing group or create a new one.</p>

                {lobbyError && <p style={{ color: 'red' }}>{lobbyError}</p>}

                <div style={{ marginTop: '2rem' }}>
                    <h3>Join a Room</h3>
                    <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <input
                            type="text"
                            placeholder="6-character code"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            maxLength={6}
                            style={{ width: '150px', textAlign: 'center', textTransform: 'uppercase' }}
                            required
                        />
                        <button type="submit" disabled={busy}>Join</button>
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
                            maxLength={60}
                            required
                        />
                        <button type="submit" disabled={busy} style={{ backgroundColor: '#28a745' }}>Create</button>
                    </form>
                </div>
            </div>
        );
    }

    // CHAT view
    return (
        <>
            <Timer />
            <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                        <h3 style={{ margin: 0 }}>{roomDetails.name}</h3>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#666' }}>
                            Room Code: <strong style={{ color: '#007bff', fontSize: '1.1rem' }}>{roomDetails.code}</strong>
                            {!connected && <span style={{ marginLeft: 8 }}>· connecting...</span>}
                        </p>
                    </div>
                    <button onClick={handleLeaveRoom} style={{ padding: '5px 10px', fontSize: '0.8rem', backgroundColor: '#dc3545' }}>
                        Leave Room
                    </button>
                </div>

                {error && <p style={{ color: '#dc3545' }}>{error}</p>}

                <div
                    ref={chatContainerRef}
                    style={{
                        height: '300px',
                        overflowY: 'auto',
                        border: '1px solid #ccc',
                        padding: '10px',
                        marginBottom: '1rem',
                        borderRadius: 'var(--border-radius)',
                        backgroundColor: '#f9f9f9',
                    }}
                >
                    {messages.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#888' }}>
                            No messages yet. Share the code <b>{roomDetails.code}</b> to invite others!
                        </p>
                    )}

                    {messages.map((msg) => {
                        const own = isOwn(msg);
                        return (
                            <div key={msg._id} style={{ margin: '0.5rem 0', textAlign: own ? 'right' : 'left' }}>
                                <div
                                    style={{
                                        display: 'inline-block',
                                        padding: '8px 12px',
                                        borderRadius: '15px',
                                        backgroundColor: own ? '#ffc0cb' : '#90D5FF',
                                        border: '1px solid #ddd',
                                        color: '#222',
                                        maxWidth: '85%',
                                        overflowWrap: 'anywhere',
                                        opacity: msg.pending ? 0.6 : 1,
                                    }}
                                >
                                    <strong style={{ fontSize: '0.8rem', display: 'block', marginBottom: '2px' }}>
                                        {own ? 'You' : msg.sender}
                                    </strong>
                                    {msg.text || msg.message}
                                    <span style={{ fontSize: '0.7rem', color: 'gray', marginLeft: '8px' }}>
                                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <form onSubmit={handleSend} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        style={{ flexGrow: 1 }}
                        maxLength={2000}
                        placeholder={connected ? 'Type your message...' : 'Connecting...'}
                    />
                    <button type="submit" disabled={!connected}>Send</button>
                </form>
            </div>
        </>
    );
};

export default StudyRoom;
