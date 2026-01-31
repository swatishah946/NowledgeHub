import React, { useState } from 'react';
import { askAI } from '../../services/aiService';
import AIResponse from '../Chat/AIResponse';
import './AiAssistant.css';

const AiAssistant = () => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

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
            const aiResponse = await askAI(query.trim());
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

    return (
        <div className="ai-assistant-container glass-card">
            <div className="ai-header">
                <h2>🤖 AI Study Assistant</h2>
                <p>Ask me anything about programming, technology, or study topics!</p>
            </div>

            <form onSubmit={handleAskAI} className="ai-input-form">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ask any study-related query..."
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
                        {loading ? 'Asking AI...' : 'Ask AI'}
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
                        <span>🤖</span> AI Response:
                    </div>
                    <AIResponse content={response} />
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