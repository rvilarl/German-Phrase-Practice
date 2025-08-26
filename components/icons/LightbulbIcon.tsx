import React from 'react';

const LightbulbIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M9 18h6" />
    <path d="M10 22h4" />
    <path d="M12 2a7 7 0 0 0-7 7c0 2.05 1.17 3.81 2.82 4.91.89.6 1.18 1.09 1.18 1.59v1h6v-1c0-.5.29-1 .18-1.59C17.83 14.81 19 13.05 19 11a7 7 0 0 0-7-7z" />
  </svg>
);

export default LightbulbIcon;
