import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/Shared/ProtectedRoute";

// Each page is loaded only when it is first visited, so the heavy 3D
// background (three.js + Vanta) isn't downloaded for every page.
const HomePage = lazy(() => import("../pages/HomePage"));
const LoginPage = lazy(() => import("../pages/LoginPage"));
const RegisterPage = lazy(() => import("../pages/RegisterPage"));
const VerifyPage = lazy(() => import("../pages/VerifyPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const AiAssistantPage = lazy(() => import("../pages/AIAssistantPage"));
const ChatPage = lazy(() => import("../pages/ChatPage"));
const RoadmapPage = lazy(() => import("../pages/RoadmapPage"));
const StudyRoomPage = lazy(() => import("../pages/StudyRoomPage"));
const QuizPage = lazy(() => import("../pages/QuizPage"));

const Loading = () => (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#aaa" }}>Loading...</div>
);

const AppRoutes = () => {
    return (
        <Router>
            <Suspense fallback={<Loading />}>
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
            </Suspense>
        </Router>
    );
};

export default AppRoutes;
