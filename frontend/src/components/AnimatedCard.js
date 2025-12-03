import React from 'react';
import './AnimatedCard.css';

function AnimatedCard({ children, delay = 0, className = '' }) {
  return (
    <div 
      className={`animated-card ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default AnimatedCard;

