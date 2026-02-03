import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/Auth/AuthLayout';
import { registerUser } from '../services/authService';
import { toast } from 'react-hot-toast';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // New Password Strength State
    const [passwordError, setPasswordError] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);

    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Password Validation Effect
    useEffect(() => {
        if (password.length > 0) {
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
            if (!passwordRegex.test(password)) {
                setPasswordError("Password must be at least 6 chars & include letters, numbers, and a special character.");
                setIsPasswordValid(false);
            } else {
                setPasswordError('');
                setIsPasswordValid(true);
            }
        } else {
            setPasswordError('');
            setIsPasswordValid(false);
        }
    }, [password]);

    const handleRegister = async (e) => {
        e.preventDefault();
        if (!isPasswordValid) return;

        setLoading(true);
        const toastId = toast.loading('Registering...');
        try {
            await registerUser({ name, email, password });
            toast.success('Registration successful! Please verify your email.', { id: toastId });
            navigate('/verify');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Registration failed', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Create Account"
            subtitle="Join NowledgeHub to start your AI learning journey."
            linkText="Already have an account?"
            linkTo="/login"
        >
            <form onSubmit={handleRegister}>
                <div className="input-group">
                    <label>Full Name</label>
                    <input
                        type="text"
                        className="auth-input"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="input-group">
                    <label>Email Address</label>
                    <input
                        type="email"
                        className="auth-input"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="input-group">
                    <label>Password</label>
                    <input
                        type="password"
                        className="auth-input"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>

                {passwordError && (
                    <p style={{ color: '#ff4d4d', fontSize: '0.8rem', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                        {passwordError}
                    </p>
                )}

                <button type="submit" className="auth-btn" disabled={loading || !isPasswordValid}>
                    {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </form>
        </AuthLayout>
    );
};

export default RegisterPage;
