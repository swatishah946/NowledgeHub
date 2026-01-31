import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyUserOtp } from '../../services/authService';
import { toast } from 'react-hot-toast';
import './AuthForm.css';

const VerifyForm = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Verifying...');
        try {
            await verifyUserOtp({ email, otp });
            toast.success('Email verified successfully!', { id: toastId });
            navigate('/login');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Verification failed', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
             <div className="auth-form card">
                <h2>Verify Email</h2>
                <p>Enter the OTP sent to your email address.</p>
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
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="OTP"
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default VerifyForm;