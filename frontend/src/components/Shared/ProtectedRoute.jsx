import React from 'react';
import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '../../utils/authUtils';


const ProtectedRoute = ({ children }) => {
    const authenticated = isLoggedIn();

    if (!authenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
