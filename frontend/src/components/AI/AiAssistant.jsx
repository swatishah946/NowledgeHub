import React, { useState, useEffect } from 'react';
import { askAI, askDeepResearch, getSession, uploadPDF, askPDF } from '../../services/aiService';
import { downloadMarkdown } from '../../utils/fileUtils';
import { FaDownload, FaFilePdf, FaUpload } from 'react-icons/fa';
import AIResponse from '../Chat/AIResponse';
import HistorySidebar from './HistorySidebar';
import ModeSwitcher from './ModeSwitcher';
import './AiAssistant.css';

const AiAssistant = () => {
    const [mode, setMode] = useState('chat'); // 'chat' | 'pdf' | 'research'

    // Separate states for each mode
    const [queries, setQueries] = useState({ chat: '', pdf: '', research: '' });
    const [responses, setResponses] = useState({ chat: '', pdf: '', research: '' });

    // Derived values for current mode
    const query = queries[mode];
    const response = responses[mode];

    // Helper setters for current mode (to minimize code changes in logic)
    const setQuery = (val) => setQueries(prev => ({ ...prev, [mode]: val }));
    const setResponse = (val) => setResponses(prev => ({ ...prev, [mode]: val }));
    const [sessionId, setSessionId] = useState(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Restored missing states
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');

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
            } else if (mode === 'pdf') {
                aiResponse = await askPDF(query.trim());
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

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        setMsg('');
        setError('');

        try {
            await uploadPDF(file);
            setMsg('✅ PDF Indexed! Ask me anything.');
        } catch (err) {
            setError('Failed to upload PDF.');
            console.error(err);
        } finally {
            setUploading(false);
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
        const targetMode = session.type === 'research' ? 'research' : 'chat';

        setSessionId(session.sessionId);
        setMode(targetMode);
        setIsSidebarOpen(false);

        // Reset query/response for the target mode before loading
        setQueries(prev => ({ ...prev, [targetMode]: '' }));
        setResponses(prev => ({ ...prev, [targetMode]: '' }));

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
                    setResponses(prev => ({ ...prev, [targetMode]: lastAiMsg.content }));

                    const lastUserMsg = [...fullSession.messages].reverse().find(m => m.role === 'user');
                    if (lastUserMsg) {
                        setQueries(prev => ({ ...prev, [targetMode]: lastUserMsg.content }));
                    }
                } else {
                    console.warn("No AI message found in session.");
                    setResponses(prev => ({ ...prev, [targetMode]: "Session loaded, but no AI response found." }));
                }
            } else {
                console.warn("Session found but has no messages or is invalid.");
                setResponses(prev => ({ ...prev, [targetMode]: "Empty session loaded." }));
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

            {mode === 'pdf' && (
                <div className="pdf-upload-section">
                    <label className="pdf-dropzone glass-card">
                        <input type="file" accept="application/pdf" onChange={handleFileUpload} hidden />
                        <div className="dropzone-content">
                            <FaFilePdf className="pdf-icon" />
                            {uploading ? (
                                <p>⏳ Indexing PDF... This may take a few seconds.</p>
                            ) : msg ? (
                                <p className="success-msg">{msg}</p>
                            ) : (
                                <p>Click to Upload PDF & Start Studying</p>
                            )}
                        </div>
                    </label>
                </div>
            )}

            <form onSubmit={handleAskAI} className="ai-input-form">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                        mode === 'research' ? "Enter a topic for deep research..." :
                            mode === 'pdf' ? "Ask questions about your PDF..." :
                                "Ask any study-related query..."
                    }
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