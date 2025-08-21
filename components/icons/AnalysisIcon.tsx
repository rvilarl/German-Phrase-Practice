import React from 'react';

const AnalysisIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 2a2.5 2.5 0 0 0 -2.5 2.5c0 1.022 .544 1.92 1.362 2.378a2.5 2.5 0 0 0 2.276 0c.818 -.458 1.362 -1.356 1.362 -2.378a2.5 2.5 0 0 0 -2.5 -2.5z" />
    <path d="M12 2a2.5 2.5 0 0 1 2.5 2.5c0 1.022 -.544 1.92 -1.362 2.378a2.5 2.5 0 0 1 -2.276 0c-.818 -.458 -1.362 -1.356 -1.362 -2.378a2.5 2.5 0 0 1 2.5 -2.5z" transform="rotate(180 12 12)" />
    <path d="M12 2a2.5 2.5 0 0 1 2.5 2.5c0 1.022 -.544 1.92 -1.362 2.378a2.5 2.5 0 0 1 -2.276 0c-.818 -.458 -1.362 -1.356 -1.362 -2.378a2.5 2.5 0 0 1 2.5 -2.5z" transform="rotate(90 12 12)" />
    <path d="M12 2a2.5 2.5 0 0 1 2.5 2.5c0 1.022 -.544 1.92 -1.362 2.378a2.5 2.5 0 0 1 -2.276 0c-.818 -.458 -1.362 -1.356 -1.362 -2.378a2.5 2.5 0 0 1 2.5 -2.5z" transform="rotate(270 12 12)" />
    <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M12 12l0 -3.5" />
    <path d="M12 12l0 3.5" />
    <path d="M12 12l3.5 0" />
    <path d="M12 12l-3.5 0" />
  </svg>
);

export default AnalysisIcon;
