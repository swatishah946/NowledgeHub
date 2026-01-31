NowledgeHub - AI Learning Platform 🚀


Welcome to NowledgeHub, an all-in-one, AI-powered learning assistant designed to revolutionize how students study and collaborate. This platform provides a suite of intelligent tools to enhance productivity, generate personalized learning materials, and foster a collaborative study environment.

✨ Key Features
🤖 AI Assistant: Get instant, conversational help with complex topics, summarize articles, or ask any study-related question.

🗺️ AI Roadmap Generator: Automatically create personalized, step-by-step learning plans for any subject or skill.

🧠 AI Quiz Generator: Test your knowledge by generating multiple-choice quizzes on any topic you can think of.

📝 Collaborative Study Rooms: Join live, focused study sessions with a shared chat, a group pomodoro timer, and other collaborative tools.

💬 Real-time Chat: Connect and collaborate with fellow students in a global chat room.

🔐 Secure Authentication: Full user authentication system with email verification and secure JWT-based sessions.

📱 Fully Responsive Design: A seamless experience across all devices, from mobile phones to desktops.

🛠️ Tech Stack
This project is a full-stack MERN application, enhanced with the power of Google's Generative AI.

Frontend:

React.js: For building a fast and dynamic user interface.

React Router: For client-side routing and navigation.

Axios: For making HTTP requests to the backend API.

Socket.IO Client: For real-time communication in chat and study rooms.

React Hot Toast: For clean and modern user notifications.

Backend:

Node.js: As the JavaScript runtime environment.

Express.js: As the web application framework.

MongoDB: As the NoSQL database for storing user data, roadmaps, etc.

Mongoose: As the Object Data Modeling (ODM) library for MongoDB.

Google Generative AI (Gemini): For powering all AI-driven features.

JSON Web Tokens (JWT): For secure user authentication.

Socket.IO: For enabling real-time, bidirectional communication.

Nodemailer: For sending verification emails.

🚀 Getting Started
Follow these instructions to get a local copy of the project up and running.

Prerequisites
Node.js (v18.x or later recommended)

npm or yarn

MongoDB (local instance or a cloud-based service like MongoDB Atlas)

A Gemini API Key from Google AI Studio

Installation
Clone the repository:

git clone [https://github.com/your-username/NowledgeHub.git](https://github.com/your-username/NowledgeHub.git)
cd NowledgeHub

Install Backend Dependencies:

cd backend
npm install

Install Frontend Dependencies:

cd ../frontend
npm install

Environment Variables
You'll need to create a .env file in the backend directory. This file will store your sensitive credentials.

backend/.env

# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGO_URI=your_mongodb_connection_string

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key

# Nodemailer Configuration (for email verification)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password

📜 Available Scripts
In the frontend directory:
npm start: Runs the app in development mode.

npm run build: Builds the app for production.

In the backend directory:
npm run server: Starts the backend server using nodemon for live reloading.

npm start: Starts the server in production mode.

Running Both Servers Concurrently
For the best development experience, open two terminals:

In the first terminal, run the backend:

cd backend
npm run server

In the second terminal, run the frontend:

cd frontend
npm start
