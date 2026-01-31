import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Shared/Layout';
import { isLoggedIn } from '../utils/authUtils';
import NET from 'vanta/dist/vanta.net.min';
import * as THREE from 'three';
import './HomePage.css';

const HomePage = () => {
    const loggedIn = isLoggedIn();
    const [vantaEffect, setVantaEffect] = useState(null);
    const vantaRef = useRef(null);

    useEffect(() => {
        if (!vantaEffect) {
            setVantaEffect(NET({
                el: vantaRef.current,
                THREE: THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,
                scale: 1.00,
                scaleMobile: 1.00,
                color: 0xd44775,       // Primary Pink Accent (Dots)
                backgroundColor: 0xe091b, // Deep Dark Purple Background
                points: 12.00,
                maxDistance: 22.00,
                spacing: 18.00,
                showDots: true
            }));
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        };
    }, [vantaEffect]);

    return (
        <Layout>
            {/* HERO SECTION WITH VANTA BACKGROUND */}
            <div className="hero-section" ref={vantaRef}>
                <div className="hero-content container">
                    <h1 className="hero-title">
                        Master Your Future with <span className="gradient-text">NowledgeHub</span>
                    </h1>
                    <p className="hero-subtitle">
                        Your all-in-one AI-powered learning ecosystem.
                        Generate roadmaps, collaborate in study rooms, and unlock your potential.
                    </p>

                    <div className="cta-group">
                        {loggedIn ? (
                            <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
                        ) : (
                            <>
                                <Link to="/register" className="btn-primary">Get Started Free</Link>
                                <Link to="/about" className="btn-secondary">Learn More</Link>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* --- FEATURES SECTION (Bento Grid) --- */}
            <section className="features-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Why Choose NowledgeHub?</h2>
                        <p>Everything you need to excel, in one unified platform.</p>
                    </div>

                    <div className="features-grid">
                        <div className="feature-card glass-card">
                            <div className="icon-wrapper">
                                <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="AI Assistant" style={{ width: '60px', height: '60px' }} />
                            </div>
                            <h3>AI Assistant</h3>
                            <p>Get instant help with complex topics, summarize articles, and ask any study-related question 24/7.</p>
                        </div>
                        <div className="feature-card glass-card">
                            <div className="icon-wrapper">
                                <img src="https://cdn-icons-png.flaticon.com/512/854/854878.png" alt="Roadmap" style={{ width: '60px', height: '60px' }} />
                            </div>
                            <h3>AI Roadmap Generator</h3>
                            <p>Generate personalized learning paths for any subject, from web development to data science.</p>
                        </div>
                        <div className="feature-card glass-card">
                            <div className="icon-wrapper">
                                <img src="https://cdn-icons-png.flaticon.com/512/3203/3203478.png" alt="Study Room" style={{ width: '60px', height: '60px' }} />
                            </div>
                            <h3>Collaborative Study Rooms</h3>
                            <p>Join live study sessions with a shared chat, timer, and collaborative tools to stay focused.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- HOW IT WORKS SECTION --- */}
            <section className="how-it-works-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Get Started in 3 Simple Steps</h2>
                    </div>
                    <div className="steps-container">
                        <div className="step-card">
                            <span className="step-number">01</span>
                            <h3>Create Account</h3>
                            <p>Sign up for free and set up your personalized profile.</p>
                        </div>
                        <div className="step-card">
                            <span className="step-number">02</span>
                            <h3>Explore Tools</h3>
                            <p>Access the AI Assistant, Roadmap Builder, and Study Rooms.</p>
                        </div>
                        <div className="step-card">
                            <span className="step-number">03</span>
                            <h3>Start Learning</h3>
                            <p>Join a session, create a plan, or get AI help instantly.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- TESTIMONIALS SECTION --- */}
            <section className="testimonials-section">
                <div className="container">
                    <div className="section-header">
                        <h2>Trusted by Students</h2>
                    </div>
                    <div className="testimonials-grid">
                        <div className="testimonial-card glass-card">
                            <p>"NowledgeHub AI Assistant is a lifesaver for my computer science homework. The explanations are clear!"</p>
                            <div className="user-info">
                                <h4>Harshit</h4>
                                <span>College Student</span>
                            </div>
                        </div>
                        <div className="testimonial-card glass-card">
                            <p>"The roadmap generator gave me a clear path to learn React. I went from novice to builder in weeks."</p>
                            <div className="user-info">
                                <h4>Prashant</h4>
                                <span>Aspiring Developer</span>
                            </div>
                        </div>
                        <div className="testimonial-card glass-card">
                            <p>"The focused study rooms have been amazing for my productivity. The group timer keeps us accountable."</p>
                            <div className="user-info">
                                <h4>Amit</h4>
                                <span>Student, AITH Kanpur</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FINAL CTA SECTION --- */}
            <section className="cta-section">
                <div className="container text-center">
                    <h2>Ready to Boost Your Learning?</h2>
                    <p>Join thousands of students and start your journey today.</p>
                    {loggedIn ? (
                        <Link to="/dashboard" className="btn-primary large">Explore Features</Link>
                    ) : (
                        <Link to="/register" className="btn-primary large">Sign Up Now</Link>
                    )}
                </div>
            </section>
        </Layout>
    );
};

export default HomePage;