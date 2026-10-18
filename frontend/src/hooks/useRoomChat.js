import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { BASE_URL } from '../config';
import { getToken } from '../utils/authUtils';
import { getUserProfile } from '../services/authService';
import { getRecentMessages } from '../services/chatService';

/**
 * Real-time chat for one room: loads the last 50 messages, connects an
 * authenticated socket, joins the room and exposes send().
 * Messages have the shape { _id, text, sender (name), senderId, createdAt }.
 */
export default function useRoomChat(roomId) {
    const [messages, setMessages] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState('');
    const socketRef = useRef(null);

    useEffect(() => {
        getUserProfile()
            .then(({ data }) => setCurrentUser(data.user))
            .catch((err) => console.error('Failed to fetch user profile', err));
    }, []);

    useEffect(() => {
        if (!roomId) return undefined;
        let cancelled = false;
        setMessages([]);
        setError('');

        getRecentMessages(roomId)
            .then((history) => {
                if (!cancelled) setMessages((live) => [...history, ...live.filter((m) => !history.some((h) => h._id === m._id))]);
            })
            .catch(() => !cancelled && setError('Could not load earlier messages.'));

        const socket = io(BASE_URL.replace(/\/+$/, ''), { auth: { token: getToken() } });
        socketRef.current = socket;

        const join = () =>
            socket.emit('joinRoom', roomId, (res) => {
                if (res && !res.ok) setError(res.error || 'Could not join the room.');
            });

        socket.on('connect', () => {
            setConnected(true);
            join(); // also re-joins automatically after a reconnect
        });
        socket.on('disconnect', () => setConnected(false));
        socket.on('connect_error', (err) => {
            setConnected(false);
            setError(err.message?.startsWith('Authentication') ? 'Please log in again to use chat.' : 'Connection problem, retrying...');
        });
        socket.on('receiveMessage', (msg) => setMessages((prev) => [...prev, msg]));

        return () => {
            cancelled = true;
            socket.disconnect();
            socketRef.current = null;
        };
    }, [roomId]);

    const send = useCallback(
        (text) => {
            const socket = socketRef.current;
            const trimmed = text.trim();
            if (!socket || !trimmed) return;

            const tempId = `local-${Date.now()}`;
            setMessages((prev) => [
                ...prev,
                { _id: tempId, text: trimmed, sender: 'You', senderId: currentUser?._id, createdAt: new Date().toISOString(), pending: true },
            ]);
            socket.emit('sendMessage', { roomId, message: trimmed }, (res) => {
                setMessages((prev) =>
                    res?.ok
                        ? prev.map((m) => (m._id === tempId ? { ...res.message, sender: 'You' } : m))
                        : prev.filter((m) => m._id !== tempId)
                );
                if (!res?.ok) setError(res?.error || 'Message could not be sent.');
            });
        },
        [roomId, currentUser]
    );

    const isOwn = useCallback(
        (msg) => msg.sender === 'You' || (currentUser && msg.senderId && msg.senderId === String(currentUser._id)),
        [currentUser]
    );

    return { messages, currentUser, connected, error, send, isOwn };
}
