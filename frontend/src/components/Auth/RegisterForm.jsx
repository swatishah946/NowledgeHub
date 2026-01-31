import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerUser } from '../../services/authService';
import { toast } from 'react-hot-toast';
import './AuthForm.css';

const RegisterForm = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // --- START: New Password Strength Feature ---
    const [passwordError, setPasswordError] = useState('');
    const [isPasswordValid, setIsPasswordValid] = useState(false);

    useEffect(() => {
        if (password.length > 0) {
            // Password must be at least 6 chars, with one letter and one number
            const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;


            if (!passwordRegex.test(password)) {
                setPasswordError("Password must be at least 6 characters & include letters and numbers with one special character.");
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
    // --- END: New Password Strength Feature ---

    const handleRegister = async (e) => {
        e.preventDefault();
        // --- START: New Password Strength Feature ---
        if (!isPasswordValid) {
            toast.error("Please enter a valid password.");
            return;
        }
        // --- END: New Password Strength Feature ---

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
        <div className="auth-container">
            <div className="auth-form card">
                <h2>Create an Account</h2>
                <form onSubmit={handleRegister}>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name"
                        required
                    />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Valid Email"
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        required
                    />
                    {/* --- START: New Password Strength Feature --- */}
                    {passwordError && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '1rem' }}>{passwordError}</p>}
                    {/* --- END: New Password Strength Feature --- */}
                    <button type="submit" disabled={loading || !isPasswordValid}>
                        {loading ? 'Registering...' : 'Register'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default RegisterForm;