import React, { useState, useEffect } from 'react';
import './Timer.css';

// Using a named export
export const Timer = () => {
    const [seconds, setSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);

    useEffect(() => {
        let interval = null;
        if (isRunning) {
            interval = setInterval(() => {
                setSeconds(prevSeconds => prevSeconds + 1);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isRunning]);

    const formatTime = () => {
        const getSeconds = `0${seconds % 60}`.slice(-2);
        const minutes = `${Math.floor(seconds / 60)}`;
        const getMinutes = `0${minutes % 60}`.slice(-2);
        const getHours = `0${Math.floor(seconds / 3600)}`.slice(-2);
        return `${getHours} : ${getMinutes} : ${getSeconds}`;
    };

    return (
        <div className="timer-card card">
            <h3>Study Timer</h3>
            <p className="timer-display">{formatTime()}</p>
            <div className="timer-controls">
                <button onClick={() => setIsRunning(true)} disabled={isRunning}>Start</button>
                <button onClick={() => setIsRunning(false)} disabled={!isRunning}>Pause</button>
                <button onClick={() => {
                    setSeconds(0);
                    setIsRunning(false);
                }}>Reset</button>
            </div>
        </div>
    );
};