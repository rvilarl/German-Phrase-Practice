import React from 'react';

const KeyboardIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <rect x="3" y="4" width="18" height="16" rx="2" ry="2" />
    <line x1="7" y1="9" x2="7.01" y2="9" />
    <line x1="12" y1="9" x2="12.01" y2="9" />
    <line x1="17" y1="9" x2="17.01" y2="9" />
    <line x1="7" y1="14" x2="7.01" y2="14" />
    <line x1="12" y1="14" x2="12.01" y2="14" />
    <line x1="17" y1="14" x2="17.01" y2="14" />
    <line x1="9" y1="19" x2="15" y2="19" />
  </svg>
);

export default KeyboardIcon;