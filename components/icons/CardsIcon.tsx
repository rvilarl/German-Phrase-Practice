import React from 'react';

const CardsIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M21.99 8c0-.55-.45-1-1-1h-16c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h16c.55 0 1-.45 1-1V8zM20 18H6V9h14v9z"></path>
    <path d="M2 6v11h2V6c0-1.65 1.35-3 3-3h12V1H5C3.35 1 2 2.35 2 4v2z"></path>
  </svg>
);

export default CardsIcon;
