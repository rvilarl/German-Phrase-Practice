import React from 'react';

const GeminiLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg" 
    {...props}
  >
    <path 
      d="M12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2Z" 
      stroke="url(#paint0_linear_1_2)" 
      strokeWidth="2"
    />
    <path 
      d="M12 6.13159C15.2343 6.13159 17.8684 8.76568 17.8684 12C17.8684 15.2343 15.2343 17.8684 12 17.8684C8.76568 17.8684 6.13159 15.2343 6.13159 12C6.13159 8.76568 8.76568 6.13159 12 6.13159Z" 
      fill="url(#paint1_linear_1_2)"
    />
    <defs>
      <linearGradient id="paint0_linear_1_2" x1="2" y1="12" x2="22" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4"/>
        <stop offset="0.5" stopColor="#9B72CB"/>
        <stop offset="1" stopColor="#D96570"/>
      </linearGradient>
      <linearGradient id="paint1_linear_1_2" x1="6.13159" y1="12" x2="17.8684" y2="12" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4285F4"/>
        <stop offset="0.5" stopColor="#9B72CB"/>
        <stop offset="1" stopColor="#D96570"/>
      </linearGradient>
    </defs>
  </svg>
);

export default GeminiLogo;