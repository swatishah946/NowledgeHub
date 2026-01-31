import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
// FIX: Changed 'generateQuiz' to 'getQuiz' to match the exported function name
import { getQuiz } from '../../services/aiService';
import './Quiz.css';

const Quiz = () => {
    const [topic, setTopic] = useState('');
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleGenerateQuiz = async (e) => {
        e.preventDefault();
        if (!topic.trim()) {
            toast.error('Please enter a topic.');
            return;
        }
        setLoading(true);
        setQuiz(null);
        setAnswers({});
        setScore(null);
        // const toastId = toast.loading('Generating your quiz...');

        try {
            // FIX: Call the correctly imported 'getQuiz' function
            const quizData = await getQuiz(topic);
            if (quizData && quizData.questions) {
                setQuiz(quizData);
                // toast.success('Quiz generated successfully!', { id: toastId });
            } else {
                throw new Error("Received invalid quiz data from AI.");
            }
        } catch (err) {
            // toast.error(err.message || 'Failed to generate quiz.', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerChange = (questionIndex, option) => {
        setAnswers({
            ...answers,
            [questionIndex]: option,
        });
    };

    const handleSubmitQuiz = () => {
        let currentScore = 0;
        quiz.questions.forEach((q, index) => {
            if (answers[index] === q.correctAnswer) {
                currentScore++;
            }
        });
        setScore(currentScore);
        toast.success(`You scored ${currentScore} out of ${quiz.questions.length}!`);
    };

    return (
        <div className="quiz-container">
            {!quiz ? (
                <div>
                    <h2>🧠 AI Quiz Generator</h2>
                    <p style={{ color: '#aaa', marginBottom: '2rem' }}>
                        Enter a topic, and I'll generate a challenge for you.
                    </p>
                    <form onSubmit={handleGenerateQuiz} className="quiz-form">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g., 'JavaScript Promises' or 'Quantum Mechanics'"
                            required
                        />
                        <button type="submit" disabled={loading} className="btn-primary">
                            {loading ? 'Generating...' : 'Start Quiz'}
                        </button>
                    </form>
                </div>
            ) : (
                <div>
                    <h2 style={{ color: 'var(--primary-color)', marginBottom: '2rem' }}>Topic: {quiz.topic}</h2>
                    {quiz.questions.map((q, qIndex) => (
                        <div key={qIndex} className="question-block">
                            <h4 className="quiz-question">{qIndex + 1}. {q.question}</h4>
                            <div className="quiz-options">
                                {q.options.map((option, oIndex) => (
                                    <div
                                        key={oIndex}
                                        className={`option-btn ${answers[qIndex] === option ? 'selected' : ''} ${score !== null && option === q.correctAnswer ? 'correct' : ''} ${score !== null && answers[qIndex] === option && option !== q.correctAnswer ? 'incorrect' : ''}`}
                                        onClick={() => {
                                            if (score === null) handleAnswerChange(qIndex, option);
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${qIndex}`}
                                            value={option}
                                            checked={answers[qIndex] === option}
                                            readOnly
                                            className="option-radio"
                                        />
                                        {option}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}

                    {score === null ? (
                        <button onClick={handleSubmitQuiz} disabled={Object.keys(answers).length !== quiz.questions.length} className="btn-primary mt-4">
                            Submit Answers
                        </button>
                    ) : (
                        <div className="results-block">
                            <h3>Your Score: {score} / {quiz.questions.length}</h3>
                            <button onClick={() => { setTopic(''); setQuiz(null); }} className="btn-primary" style={{ marginTop: '1rem' }}>Try Another Topic</button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Quiz;