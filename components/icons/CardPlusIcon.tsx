import React from 'react';

const CardPlusIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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
    <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
    <path d="M12 14.5v-5" />
    <path d="M9.5 12h5" />
    <polyline points="17 2 12 7 7 2" />
  </svg>
);

export default CardPlusIcon;
