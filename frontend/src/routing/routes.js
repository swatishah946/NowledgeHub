
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/RegisterPage";
import VerifyPage from "../pages/VerifyPage";
import DashboardPage from "../pages/DashboardPage";
import AiAssistantPage from "../pages/AIAssistantPage";
import ChatPage from "../pages/ChatPage";
import RoadmapPage from "../pages/RoadmapPage";
import StudyRoomPage from "../pages/StudyRoomPage";
import ProtectedRoute from '../components/Shared/ProtectedRoute';
import QuizPage from '../pages/QuizPage'


const AppRoutes = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<HomePage />} />

                <Route path="/login" element={<LoginPage />} />

                <Route path="/register" element={<RegisterPage />} />


                <Route path="/verify" element={<VerifyPage />} />

                {/* Protected routes */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />


                <Route path="/ai" element={<ProtectedRoute><AiAssistantPage /></ProtectedRoute>} />



                <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />


                <Route path="/roadmap" element={<ProtectedRoute><RoadmapPage /></ProtectedRoute>} />


                <Route path="/study-room" element={<ProtectedRoute><StudyRoomPage /></ProtectedRoute>} />

                <Route path="/quiz" element={<ProtectedRoute><QuizPage /></ProtectedRoute>} />


                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </Router>
    );
};

export default AppRoutes;
