import React from 'react';

const PageBackground = ({ children }) => {
    return (
        <div style={{
            minHeight: '100vh',
            background: 'radial-gradient(circle at top center, #2a243d 0%, #100e17 100%)',
            paddingTop: '30px' // Space for content
        }}>
            {children}
        </div>
    );
};

export default PageBackground;
