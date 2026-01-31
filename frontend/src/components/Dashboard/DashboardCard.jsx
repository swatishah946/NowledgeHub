import React from 'react';
import { Link } from 'react-router-dom';
import './DashboardCard.css';

const DashboardCard = ({ title, description, icon, link, color }) => {
    return (
        <Link to={link} className="dashboard-card" style={{ '--card-accent': color }}>
            <div className="card-content">
                <div className="icon-wrapper">
                    {/* Render the image icon passed as prop */}
                    <img src={icon} alt={title} className="card-icon" />
                    {/* A glow effect behind the icon */}
                    <div className="icon-glow" style={{ backgroundColor: color }}></div>
                </div>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
            <div className="card-shine"></div>
        </Link>
    );
};

export default DashboardCard;
