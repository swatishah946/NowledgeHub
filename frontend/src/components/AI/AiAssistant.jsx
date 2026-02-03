import React, { useState, useEffect } from 'react';
import { askAI, askDeepResearch, getSession } from '../../services/aiService';
import { downloadMarkdown } from '../../utils/fileUtils';
import { FaDownload } from 'react-icons/fa';
import AIResponse from '../Chat/AIResponse';
import HistorySidebar from './HistorySidebar';
import ModeSwitcher from './ModeSwitcher';
import './AiAssistant.css';

const AiAssistant = () => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mode, setMode] = useState('chat'); // 'chat' | 'pdf' | 'research'
    const [sessionId, setSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        // Initialize Session ID
        let sid = localStorage.getItem('ai_session_id');
        if (!sid) {
            sid = 'session-' + Date.now();
            localStorage.setItem('ai_session_id', sid);
        }
        setSessionId(sid);
    }, []);

    const handleAskAI = async (e) => {
        e.preventDefault();
        if (!query.trim()) {
            setError('Please enter a query.');
            return;
        }

        setLoading(true);
        setResponse('');
        setError('');

        try {
            let aiResponse;
            if (mode === 'research') {
                aiResponse = await askDeepResearch(query.trim(), sessionId);
            } else {
                // Map 'pdf' mode to 'pdf-chat' for backend, default 'chat'
                const type = mode === 'pdf' ? 'pdf-chat' : 'chat';
                aiResponse = await askAI(query.trim(), sessionId, type);
            }
            setResponse(aiResponse);
        } catch (err) {
            console.error('AI request error:', err);
            setError(err.message || 'AI request failed');
        } finally {
            setLoading(false);
        }
    };

    const handleClearChat = () => {
        setQuery('');
        setResponse('');
        setError('');
        // Optional: Generate new session ID for a fresh start
        // const newSid = 'session-' + Date.now();
        // localStorage.setItem('ai_session_id', newSid);
        // setSessionId(newSid);
    };

    const suggestedQuestions = [
        "What is JavaScript?",
        "How do I learn machine learning?",
        "Explain React components",
        "What is the difference between Python and Java?",
        "How to learn web development?"
    ];

    const handleSuggestedQuestion = (question) => {
        setQuery(question);
        setResponse('');
        setError('');
    };

    const handleSelectSession = async (session) => {
        console.log("Selected Session:", session);
        setSessionId(session.sessionId);
        setMode(session.type === 'research' ? 'research' : 'chat');
        setIsSidebarOpen(false);
        setQuery(''); // Clear manual input or set to last user message?

        // Fetch full session details
        setLoading(true);
        try {
            console.log("Fetching full session details for:", session.sessionId);
            const fullSession = await getSession(session.sessionId);
            console.log("Full Session Data:", fullSession);

            if (fullSession && fullSession.messages && fullSession.messages.length > 0) {
                // Try to find the last AI response to show
                const lastAiMsg = [...fullSession.messages].reverse().find(m => m.role === 'model');
                if (lastAiMsg) {
                    console.log("Found last AI message:", lastAiMsg);
                    setResponse(lastAiMsg.content);
                    // Find last user message too?
                    const lastUserMsg = [...fullSession.messages].reverse().find(m => m.role === 'user');
                    if (lastUserMsg) {
                        setQuery(lastUserMsg.content); // Restore last query to input
                    }
                } else {
                    console.warn("No AI message found in session.");
                    setResponse("Session loaded, but no AI response found.");
                }
            } else {
                console.warn("Session found but has no messages or is invalid.");
                setResponse("Empty session loaded.");
            }
        } catch (err) {
            console.error("Error loading session:", err);
            setError("Failed to load session details.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-assistant-container glass-card">
            <HistorySidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onSelectSession={handleSelectSession}
                activeMode={mode}
            />

            <button
                className="sidebar-toggle-btn"
                onClick={() => setIsSidebarOpen(true)}
            >
                📜 History
            </button>

            <div className="ai-header">
                <h2>🤖 AI Study Assistant</h2>
                <p>Ask me anything about programming, technology, or study topics!</p>
                <ModeSwitcher activeMode={mode} setMode={setMode} />
            </div>

            <form onSubmit={handleAskAI} className="ai-input-form">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={mode === 'research' ? "Enter a topic for deep research (e.g., 'Latest trends in AI 2025')..." : "Ask any study-related query..."}
                    rows={4}
                    className="ai-textarea"
                    required
                />
                <div className="button-group">
                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                    >
                        {loading ? (mode === 'research' ? '🔎 Researching...' : '🤖 Thinking...') : (mode === 'research' ? '🌍 Research' : 'Ask AI')}
                    </button>
                    <button
                        type="button"
                        onClick={handleClearChat}
                        className="btn-secondary"
                    >
                        Clear
                    </button>
                </div>
            </form>

            <div className="suggested-section">
                <h4>💡 Suggested Questions:</h4>
                <div className="tags-container">
                    {suggestedQuestions.map((question, index) => (
                        <button
                            key={index}
                            onClick={() => handleSuggestedQuestion(question)}
                            className="tag-btn"
                        >
                            {question}
                        </button>
                    ))}
                </div>
            </div>

            {response && (
                <div className="response-card">
                    <div className="response-header">
                        <span>{mode === 'research' ? '🌍' : '🤖'}</span> {mode === 'research' ? 'Deep Research Report:' : 'AI Response:'}
                    </div>
                    <AIResponse content={response} />
                    {mode === 'research' && (
                        <button
                            className="download-report-btn"
                            onClick={() => downloadMarkdown(response, `Deep_Research_${new Date().toISOString().slice(0, 10)}.md`)}
                        >
                            <FaDownload /> Download Report
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="error-card">
                    <strong>❌ Error:</strong> {error}
                </div>
            )}

            {loading && (
                <div className="loading-card">
                    <p>🤖 Thinking... Please wait</p>
                </div>
            )}
        </div>
    );
};

export default AiAssistant;