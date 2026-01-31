import React from 'react';
import './Footer.css'; // Import the new CSS file

const Footer = () => {
    const portfolioUrl = "https://github.com"; // Placeholder

    return (
        <footer className="footer">
            <div className="footer-content">
                <h3>NowledgeHub</h3>
                <p>
                    The ultimate AI-powered learning ecosystem for students.
                    Master any subject with ease using our intelligent tools.
                </p>

                <div className="social-links">
                    <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">Portfolio</a>
                    <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link">LinkedIn</a>
                    <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="social-link">GitHub</a>
                </div>

                <div className="copyright">
                    <p>
                        © 2026 Developed By{' '}
                        <a
                            href={portfolioUrl}
                            style={{ color: 'var(--primary-accent)', textDecoration: 'none' }}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Swati Shah
                        </a>
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;