
import React, { useEffect, useState } from 'react';
import { getUserHistory, deleteSession } from '../../services/aiService';
import './HistorySidebar.css';

const HistorySidebar = ({ isOpen, onClose, onSelectSession, activeMode }) => {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            setErrorMsg(null);

            // Failsafe timeout
            const timeoutId = setTimeout(() => {
                console.error("⚠️ History fetch TIMED OUT (Frontend)");
                setLoading(false);
                setErrorMsg("Request timed out. Server might be slow.");
            }, 8000);

            try {
                const data = await getUserHistory(activeMode || 'chat');
                clearTimeout(timeoutId); // Clear timeout on success
                setSessions(Array.isArray(data) ? data : []);
            } catch (err) {
                clearTimeout(timeoutId);
                console.error("   - fetchHistory Error:", err);
                setErrorMsg("Failed to load history.");
            } finally {
                setLoading(false); // This should ensure loading stops
            }
        };

        if (isOpen) {
            fetchHistory();
        }
    }, [isOpen, activeMode]);

    const handleDelete = async (e, sessionId) => {
        e.stopPropagation();
        if (window.confirm("Are you sure you want to delete this session?")) {
            try {
                await deleteSession(sessionId);
                setSessions((prev) => prev.filter(s => s.sessionId !== sessionId));
            } catch (err) {
                setErrorMsg(err.message);
            }
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className={`history-sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <h3>📜 History</h3>
                <button className="close-btn" onClick={onClose}>&times;</button>
            </div>

            <div className="history-list">
                {loading ? (
                    <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>Loading...</p>
                ) : errorMsg ? (
                    <p style={{ textAlign: 'center', color: '#ff4444', marginTop: '2rem' }}>{errorMsg}</p>
                ) : sessions.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#888', marginTop: '2rem' }}>No history found.</p>
                ) : (
                    sessions.map(session => (
                        <div
                            key={session.sessionId}
                            className="history-item"
                            onClick={() => onSelectSession(session)}
                        >
                            <div className="history-content">
                                <span className="history-title">{session.title}</span>
                                <div className="history-meta">
                                    <span>{session.type === 'pdf-chat' ? 'PDF' : session.type.toUpperCase()}</span> • {formatDate(session.updatedAt)}
                                </div>
                            </div>
                            <button
                                className="delete-btn"
                                onClick={(e) => handleDelete(e, session.sessionId)}
                            >
                                🗑️
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default HistorySidebar;
