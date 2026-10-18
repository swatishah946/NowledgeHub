import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { verifyUserOtp, resendOtp } from '../../services/authService';
import { toast } from 'react-hot-toast';
import './AuthForm.css';

const RESEND_COOLDOWN_SECONDS = 60;

const VerifyForm = () => {
    const location = useLocation();
    const [email, setEmail] = useState(location.state?.email || '');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(location.state?.email ? RESEND_COOLDOWN_SECONDS : 0);
    const navigate = useNavigate();

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Verifying...');
        try {
            await verifyUserOtp({ email: email.trim(), otp: otp.trim() });
            toast.success('Email verified successfully! Please log in.', { id: toastId });
            navigate('/login');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Verification failed', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!email.trim()) {
            toast.error('Enter your email first.');
            return;
        }
        try {
            const { data } = await resendOtp(email.trim());
            toast.success(data?.message || 'A new code has been sent.');
            setCooldown(RESEND_COOLDOWN_SECONDS);
        } catch (err) {
            const retry = err?.response?.data?.retryAfterSeconds;
            if (retry) setCooldown(retry);
            toast.error(err?.response?.data?.message || 'Could not resend the code.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form card">
                <h2>Verify Email</h2>
                <p>Enter the 6-digit code sent to your email. It expires in 10 minutes.</p>
                <form onSubmit={handleVerify}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                    />
                    <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="\d{6}"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="6-digit code"
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                </form>
                <button type="button" onClick={handleResend} disabled={cooldown > 0} style={{ marginTop: '1rem' }}>
                    {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                </button>
            </div>
        </div>
    );
};

export default VerifyForm;
