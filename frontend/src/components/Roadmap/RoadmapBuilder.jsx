import React, { useState } from 'react';
import { getRoadmap } from '../../services/aiService';
import './Roadmap.css';

const RoadmapBuilder = () => {
  const [goal, setGoal] = useState('');
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goal.trim()) {
      setError('Please enter a learning goal.');
      return;
    }
    setLoading(true);
    setError('');
    setRoadmap(null);

    try {
      const roadmapData = await getRoadmap(goal);
      setRoadmap(roadmapData);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'An unexpected error occurred.';
      setError(errorMessage);
      console.error('Error generating roadmap:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {!roadmap ? (
        <div className="roadmap-form-container">
          <h2>🗺️ AI Roadmap Generator</h2>
          <p className="roadmap-description" style={{ marginBottom: '2rem' }}>
            Enter a topic or a goal you want to learn, and the AI will generate a step-by-step learning plan for you.
          </p>
          <form onSubmit={handleSubmit}>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., 'Learn React from scratch' or 'Master Data Science'"
              required
            />
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%' }}>
              {loading ? 'Generating Path...' : 'Generate Roadmap'}
            </button>
            {error && <div style={{ color: '#e74c3c', marginTop: '1rem' }}>Error: {error}</div>}
          </form>
        </div>
      ) : (
        <div className="roadmap-container">
          <div style={{ textAlign: 'center', marginBottom: '3rem', position: 'relative', zIndex: 2 }}>
            <h2 className="roadmap-title" style={{ fontSize: '2.5rem' }}>Your Journey to "{roadmap.goal}"</h2>
            <p className="roadmap-description"><strong>Estimated Duration:</strong> {roadmap.estimatedDuration}</p>
            <button
              onClick={() => { setGoal(''); setRoadmap(null); }}
              className="btn-primary"
              style={{ marginTop: '1rem', padding: '8px 20px', fontSize: '0.9rem' }}
            >
              Start New Roadmap
            </button>
          </div>

          {roadmap.steps.map((step) => (
            <div key={step.id} className="roadmap-item">
              <h4 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Step {step.id}: {step.title}</h4>
              <p style={{ color: '#ccc', fontSize: '0.9rem', marginBottom: '1rem' }}><strong>Duration:</strong> {step.duration}</p>
              <p style={{ lineHeight: '1.6', marginBottom: '1.5rem' }}>{step.description}</p>

              <h5 style={{ color: '#fff', marginBottom: '0.5rem' }}>Example Resources:</h5>
              <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-secondary)' }}>
                {step.resources.map((resource, index) => (
                  <li key={index} style={{ marginBottom: '0.5rem' }}>{resource}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RoadmapBuilder;