// components/Dashboard/StatsCard.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import './StatsCard.css';

const StatsCard = ({ title, description, link, icon }) => {
    return (
        <Link to={link} className="stats-card">
            <div className="card-icon">{icon}</div>
            <h3>{title}</h3>
            <p>{description}</p>
        </Link>
    );
};

export default StatsCard;