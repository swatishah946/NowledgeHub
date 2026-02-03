import React from 'react';
import { FaRobot, FaBookOpen, FaGlobeAmericas } from 'react-icons/fa';

const ModeSwitcher = ({ activeMode, setMode }) => {
    return (
        <div className="mode-switcher-container">
            <button
                className={`mode-btn ${activeMode === 'chat' ? 'active' : ''}`}
                onClick={() => setMode('chat')}
            >
                <FaRobot /> AI Chat
            </button>
            <button
                className={`mode-btn ${activeMode === 'pdf' ? 'active' : ''}`}
                onClick={() => setMode('pdf')}
            >
                <FaBookOpen /> PDF Study
            </button>
            <button
                className={`mode-btn ${activeMode === 'research' ? 'active' : ''}`}
                onClick={() => setMode('research')}
            >
                <FaGlobeAmericas /> Deep Research
            </button>
        </div>
    );
};

export default ModeSwitcher;
