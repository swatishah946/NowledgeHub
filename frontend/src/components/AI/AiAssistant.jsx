import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    askAI,
    askDeepResearch,
    getSession,
    uploadPDF,
    askPDF,
    listDocuments,
    deleteDocument,
} from '../../services/aiService';
import { downloadMarkdown } from '../../utils/fileUtils';
import { loadSessionIds, saveSessionIds, newSessionId } from '../../utils/session';
import { FaDownload, FaFilePdf, FaTrash, FaPlus } from 'react-icons/fa';
import AIResponse from '../Chat/AIResponse';
import HistorySidebar from './HistorySidebar';
import ModeSwitcher from './ModeSwitcher';
import './AiAssistant.css';

const EMPTY_THREADS = { chat: [], pdf: [], research: [] };
const TYPE_TO_MODE = { chat: 'chat', research: 'research', 'pdf-chat': 'pdf' };

const suggestedQuestions = [
    'What is JavaScript?',
    'How do I learn machine learning?',
    'Explain React components',
    'What is the difference between Python and Java?',
    'How to learn web development?',
];

const SourceList = ({ sources }) => {
    if (!sources?.length) return null;
    return (
        <div className="source-list">
            <strong>Sources:</strong>
            <ul>
                {sources.map((s, i) => (
                    <li key={`${s.source}-${s.page}-${i}`} title={s.preview}>
                        📄 {s.source}
                        {s.page ? `, page ${s.page}` : ''}
                        {typeof s.score === 'number' ? ` · match ${(s.score * 100).toFixed(0)}%` : ''}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const AiAssistant = () => {
    const [mode, setMode] = useState('chat'); // 'chat' | 'pdf' | 'research'
    const [inputs, setInputs] = useState({ chat: '', pdf: '', research: '' });
    const [threads, setThreads] = useState(EMPTY_THREADS);
    const [sessionIds, setSessionIds] = useState(loadSessionIds);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Each mode keeps its own loading flag and error, so a problem in one tab
    // (e.g. PDF) never shows up in another (e.g. Deep Research).
    const [busy, setBusy] = useState({ chat: false, pdf: false, research: false });
    const [errors, setErrors] = useState({ chat: '', pdf: '', research: '' });
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState('');

    const [documents, setDocuments] = useState([]);
    const [selectedSource, setSelectedSource] = useState('');
    const bottomRef = useRef(null);

    const query = inputs[mode];
    const thread = threads[mode];
    const loading = busy[mode];
    const error = errors[mode];
    const setQuery = (value) => setInputs((prev) => ({ ...prev, [mode]: value }));
    const setModeError = (targetMode, value) => setErrors((prev) => ({ ...prev, [targetMode]: value }));
    const setModeBusy = (targetMode, value) => setBusy((prev) => ({ ...prev, [targetMode]: value }));
    const addMessage = (targetMode, message) =>
        setThreads((prev) => ({ ...prev, [targetMode]: [...prev[targetMode], message] }));

    useEffect(() => {
        saveSessionIds(sessionIds);
    }, [sessionIds]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, [threads, mode]);

    const refreshDocuments = useCallback(async () => {
        try {
            const docs = await listDocuments();
            setDocuments(docs);
            setSelectedSource((current) => (docs.some((d) => d.source === current) ? current : ''));
        } catch (err) {
            console.error('Failed to load documents', err);
        }
    }, []);

    useEffect(() => {
        if (mode === 'pdf') refreshDocuments();
    }, [mode, refreshDocuments]);

    const handleAskAI = async (e) => {
        e.preventDefault();
        const text = query.trim();
        const currentMode = mode;
        if (!text) {
            setModeError(currentMode, 'Please enter a query.');
            return;
        }
        if (busy[currentMode]) return;

        const sessionId = sessionIds[currentMode];
        setModeBusy(currentMode, true);
        setModeError(currentMode, '');
        setQuery('');
        addMessage(currentMode, { role: 'user', content: text });

        try {
            if (currentMode === 'research') {
                const { response } = await askDeepResearch(text, sessionId);
                addMessage(currentMode, { role: 'model', content: response });
            } else if (currentMode === 'pdf') {
                const { response, sources } = await askPDF(text, sessionId, selectedSource || undefined);
                addMessage(currentMode, { role: 'model', content: response, sources });
            } else {
                const response = await askAI(text, sessionId);
                addMessage(currentMode, { role: 'model', content: response });
            }
        } catch (err) {
            console.error('AI request error:', err);
            setModeError(currentMode, err.message || 'AI request failed');
            // Put the question back so the user can retry without retyping it.
            setInputs((prev) => ({ ...prev, [currentMode]: prev[currentMode] || text }));
            setThreads((prev) => {
                const list = prev[currentMode];
                const last = list[list.length - 1];
                return last?.role === 'user' && last.content === text
                    ? { ...prev, [currentMode]: list.slice(0, -1) }
                    : prev;
            });
        } finally {
            setModeBusy(currentMode, false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        e.target.value = ''; // allow re-selecting the same file later
        if (!file) return;

        setUploading(true);
        setMsg('');
        setModeError('pdf', '');
        try {
            const result = await uploadPDF(file);
            const info = result?.data;
            setMsg(`✅ ${info?.fileName || file.name} indexed (${info?.pages ?? '?'} pages, ${info?.chunksCreated ?? '?'} chunks). Ask me anything!`);
            await refreshDocuments();
        } catch (err) {
            setModeError('pdf', err.message || 'Failed to upload PDF.');
        } finally {
            setUploading(false);
        }
    };

    const handleDeleteDocument = async (source) => {
        if (!window.confirm(`Remove "${source}" from your documents?`)) return;
        try {
            await deleteDocument(source);
            await refreshDocuments();
        } catch (err) {
            setModeError('pdf', err.message);
        }
    };

    const handleNewConversation = () => {
        setSessionIds((prev) => ({ ...prev, [mode]: newSessionId() }));
        setThreads((prev) => ({ ...prev, [mode]: [] }));
        setQuery('');
        setModeError(mode, '');
    };

    const handleSelectSession = async (session) => {
        const targetMode = TYPE_TO_MODE[session.type] || 'chat';
        setMode(targetMode);
        setIsSidebarOpen(false);
        setModeError(targetMode, '');
        setModeBusy(targetMode, true);
        try {
            const fullSession = await getSession(session.sessionId);
            if (!fullSession) throw new Error('Session not found');
            setSessionIds((prev) => ({ ...prev, [targetMode]: session.sessionId }));
            setThreads((prev) => ({
                ...prev,
                [targetMode]: (fullSession.messages || []).map((m) => ({
                    role: m.role === 'user' ? 'user' : 'model',
                    content: m.content,
                    sources: m.metadata?.sources && targetMode === 'pdf' ? m.metadata.sources : undefined,
                })),
            }));
        } catch (err) {
            console.error('Error loading session:', err);
            setModeError(targetMode, 'Failed to load this conversation.');
        } finally {
            setModeBusy(targetMode, false);
        }
    };

    const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

    const lastModelMessage = [...thread].reverse().find((m) => m.role === 'model');

    return (
        <div className="ai-assistant-container glass-card">
            <HistorySidebar
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
                onSelectSession={handleSelectSession}
                activeMode={mode}
                activeSessionId={sessionIds[mode]}
            />

            <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
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
                        <input type="file" accept="application/pdf" onChange={handleFileUpload} hidden disabled={uploading} />
                        <div className="dropzone-content">
                            <FaFilePdf className="pdf-icon" />
                            {uploading ? (
                                <p>⏳ Indexing PDF... large files can take a minute.</p>
                            ) : msg ? (
                                <p className="success-msg">{msg}</p>
                            ) : (
                                <p>Click to Upload PDF & Start Studying</p>
                            )}
                        </div>
                    </label>

                    {documents.length > 0 && (
                        <div className="document-list">
                            <label>
                                Ask about:{' '}
                                <select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)}>
                                    <option value="">All my documents</option>
                                    {documents.map((d) => (
                                        <option key={d.source} value={d.source}>
                                            {d.source}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <ul>
                                {documents.map((d) => (
                                    <li key={d.source}>
                                        <span>
                                            📄 {d.source}
                                            {d.pageCount ? ` · ${d.pageCount} pages` : ''} · {d.chunks} chunks
                                        </span>
                                        <button type="button" className="doc-delete-btn" onClick={() => handleDeleteDocument(d.source)} title="Remove document">
                                            <FaTrash />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {thread.length > 0 && (
                <div className="conversation">
                    {thread.map((m, i) =>
                        m.role === 'user' ? (
                            <div key={i} className="user-message">
                                {m.content}
                            </div>
                        ) : (
                            <div key={i} className="response-card">
                                <div className="response-header">
                                    <span>{mode === 'research' ? '🌍' : '🤖'}</span>{' '}
                                    {mode === 'research' ? 'Deep Research Report:' : 'AI Response:'}
                                </div>
                                <AIResponse content={m.content} />
                                <SourceList sources={m.sources} />
                            </div>
                        )
                    )}
                </div>
            )}

            {loading && (
                <div className="loading-card">
                    <p>{mode === 'research' ? '🔎 Searching the web and writing your report...' : '🤖 Thinking... Please wait'}</p>
                </div>
            )}

            {error && (
                <div className="error-card">
                    <strong>❌ Error:</strong> {error}
                </div>
            )}

            <form onSubmit={handleAskAI} className="ai-input-form">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !loading) handleAskAI(e);
                    }}
                    placeholder={
                        mode === 'research'
                            ? 'Enter a topic for deep research...'
                            : mode === 'pdf'
                              ? 'Ask questions about your PDFs...'
                              : 'Ask any study-related query... (Shift+Enter for a new line)'
                    }
                    rows={4}
                    maxLength={5000}
                    className="ai-textarea"
                    required
                />
                <div className="button-group">
                    <button type="submit" disabled={loading} className="btn-primary">
                        {loading ? (mode === 'research' ? '🔎 Researching...' : '🤖 Thinking...') : mode === 'research' ? '🌍 Research' : 'Ask AI'}
                    </button>
                    <button type="button" onClick={handleNewConversation} className="btn-secondary" disabled={loading}>
                        <FaPlus /> New conversation
                    </button>
                    {mode === 'research' && lastModelMessage && (
                        <button
                            type="button"
                            className="download-report-btn"
                            onClick={() =>
                                downloadMarkdown(lastModelMessage.content, `Deep_Research_${new Date().toISOString().slice(0, 10)}.md`)
                            }
                        >
                            <FaDownload /> Download Report
                        </button>
                    )}
                </div>
            </form>

            {mode === 'chat' && thread.length === 0 && (
                <div className="suggested-section">
                    <h4>💡 Suggested Questions:</h4>
                    <div className="tags-container">
                        {suggestedQuestions.map((question) => (
                            <button key={question} onClick={() => setQuery(question)} className="tag-btn">
                                {question}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            <div ref={bottomRef} />
        </div>
    );
};

export default AiAssistant;
