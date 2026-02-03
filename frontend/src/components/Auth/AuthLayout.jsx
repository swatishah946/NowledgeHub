
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import FOG from 'vanta/dist/vanta.fog.min';
import * as THREE from 'three';
import './AuthLayout.css';

const AuthLayout = ({ children, title, subtitle, footerText, footerLink, footerLinkText }) => {
    const [vantaEffect, setVantaEffect] = useState(null);
    const vantaRef = useRef(null);

    useEffect(() => {
        if (!vantaEffect && vantaRef.current) {
            setVantaEffect(FOG({
                el: vantaRef.current,
                THREE: THREE,
                mouseControls: true,
                touchControls: true,
                gyroControls: false,
                minHeight: 200.00,
                minWidth: 200.00,

                // --- THE "MIDNIGHT" PALETTE (Much Darker) ---
                highlightColor: 0x4a2b36,  // Very Dark Maroon (was bright pink)
                midtoneColor: 0x2c1e33,    // Dark Slate Purple
                lowlightColor: 0x08060a,   // Almost Black
                baseColor: 0x000000,       // Pure Black

                blurFactor: 0.90,          // Maximum blur for "shadow" effect
                speed: 0.60,               // Very slow drift
                zoom: 1.20
            }));
        }
        return () => {
            if (vantaEffect) vantaEffect.destroy();
        };
    }, [vantaEffect]);

    return (
        <div className="auth-screen" ref={vantaRef}>
            {/* The Cyber Grid Overlay (Adds texture on top of the Fog) */}
            <div className="auth-overlay"></div>

            {/* The Glass Card */}
            <div className="auth-card glass-panel">
                <div className="auth-header">
                    <h1 className="brand-logo">NowledgeHub</h1>
                    <h2>{title}</h2>
                    <p>{subtitle}</p>
                </div>

                <div className="auth-body">
                    {children}
                </div>

                <div className="auth-footer">
                    <p>{footerText} <Link to={footerLink} className="highlight-link">{footerLinkText}</Link></p>
                </div>
            </div>
        </div>
    );
};

export default AuthLayout;
