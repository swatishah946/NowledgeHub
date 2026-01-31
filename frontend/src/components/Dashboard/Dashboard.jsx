import React from "react";
import Layout from "../Shared/Layout";
import DashboardCard from "./DashboardCard";
import "./Dashboard.css";

const Dashboard = () => {
  return (
    <Layout>
      <div className="dashboard-page">
        <div className="container">
          <header className="dashboard-header">
            <h1>Welcome Back, <span className="highlight-text">Learner</span> 🚀</h1>
            <p>Your command center for AI-powered education.</p>
          </header>

          <div className="dashboard-grid">
            <DashboardCard
              title="AI Assistant"
              description="Ask complex questions and get instant, detailed answers."
              icon="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" /* Temporary placeholder or emoji */
              link="/ai"
              color="#c83f6b" /* Pink Glow */
            />
            <DashboardCard
              title="Chat Room"
              description="Collaborate with peers in real-time study sessions."
              icon="https://cdn-icons-png.flaticon.com/512/1041/1041916.png"
              link="/chat"
              color="#8A2BE2" /* Purple Glow */
            />
            <DashboardCard
              title="Study Room"
              description="Focus with timers, whiteboards, and group tools."
              icon="https://cdn-icons-png.flaticon.com/512/3203/3203478.png"
              link="/study-room"
              color="#FF8C00" /* Orange Glow */
            />
            <DashboardCard
              title="Roadmap Builder"
              description="Generate a personalized learning path for any skill."
              icon="https://cdn-icons-png.flaticon.com/512/854/854878.png"
              link="/roadmap"
              color="#00BFFF" /* Blue Glow */
            />
            <DashboardCard
              title="AI Quiz Generator"
              description="Test your knowledge with custom generated quizzes."
              icon="https://cdn-icons-png.flaticon.com/512/6662/6662916.png"
              link="/quiz"
              color="#32CD32" /* Green Glow */
            />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
