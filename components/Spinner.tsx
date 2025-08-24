
import React from 'react';

interface SpinnerProps {
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ className }) => {
  return (
    <svg
      className={`h-10 w-10 ${className}`}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <g fill="none" strokeWidth="6" strokeLinecap="round">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="url(#spinner-gradient)"
          strokeDasharray="282.74"
          strokeDashoffset="240"
          className="spinner-circle-1"
          style={{ transformOrigin: '50% 50%' }}
        />
        <circle
          cx="50"
          cy="50"
          r="35"
          stroke="url(#spinner-gradient)"
          strokeDasharray="219.91"
          strokeDashoffset="180"
          className="spinner-circle-2"
          style={{ transformOrigin: '50% 50%' }}
        />
        <circle
          cx="50"
          cy="50"
          r="25"
          stroke="url(#spinner-gradient)"
          strokeDasharray="157.08"
          strokeDashoffset="120"
          className="spinner-circle-3"
          style={{ transformOrigin: '50% 50%' }}
        />
      </g>
    </svg>
  );
};

export default Spinner;