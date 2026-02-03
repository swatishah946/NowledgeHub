import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/Auth/AuthLayout';
import { loginUser } from '../services/authService';
import { saveToken } from '../utils/authUtils';
import { toast } from 'react-hot-toast';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Logging in...');
        try {
            const response = await loginUser({ email, password });
            saveToken(response.data.token);
            toast.success('Login successful!', { id: toastId });
            navigate('/dashboard');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Login failed', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout
            title="Welcome Back"
            subtitle="Enter your credentials to access your workspace."
            linkText="Don't have an account?"
            linkTo="/register"
        >
            <form onSubmit={handleSubmit}>
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

                <button type="submit" className="auth-btn" disabled={loading}>
                    {loading ? 'Logging In...' : 'Sign In'}
                </button>
            </form>
        </AuthLayout>
    );
};

export default LoginPage;
