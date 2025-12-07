import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';
import { useNavigate } from 'react-router-dom';

const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_TIME = 5 * 60 * 1000; // Warn 5 minutes before timeout

function SessionTimeout() {
  const { user, logout } = useAuth();
  const { warning, info } = useToast();
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const warningShownRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const resetTimeout = () => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      warningShownRef.current = false;

      // Set warning timeout
      const warningTimeout = setTimeout(() => {
        if (!warningShownRef.current) {
          warning('Your session will expire in 5 minutes due to inactivity. Move your mouse or click anywhere to stay logged in.', 10000);
          warningShownRef.current = true;
        }
      }, INACTIVITY_TIMEOUT - WARNING_TIME);

      // Set logout timeout
      timeoutRef.current = setTimeout(() => {
        warning('Your session has expired due to inactivity. Please log in again.');
        logout();
        navigate('/login');
      }, INACTIVITY_TIMEOUT);

      return () => {
        clearTimeout(warningTimeout);
      };
    };

    // Activity events
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      document.addEventListener(event, resetTimeout, true);
    });

    // Initial timeout
    resetTimeout();

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resetTimeout, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, logout, navigate, warning]);

  return null;
}

export default SessionTimeout;

