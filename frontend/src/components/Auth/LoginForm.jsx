import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../../services/authService';
import { saveToken } from '../../utils/authUtils';
import { toast } from 'react-hot-toast';
import './AuthForm.css';

const LoginForm = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const toastId = toast.loading('Logging in...');
        try {
            // The response from axios is an object like { data: { token: '...' } }
            const response = await loginUser({ email, password });

            // --- THIS IS THE FIX ---
            // Access the token from response.data.token
            saveToken(response.data.token); 
            // --- END OF FIX ---

            toast.success('Login successful!', { id: toastId });
            navigate('/dashboard');
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Login failed', { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form card">
                <h2>Welcome Back!</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Registered Email"
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                    />
                    <button type="submit" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;