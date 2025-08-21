import React from 'react';

const DeepSeekLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <circle cx="12" cy="12" r="11" fill="#101010" />
    <path
      d="M8.5 8C9.927 7.01 11.77 6.5 13.5 6.5C16.538 6.5 19 8.962 19 12C19 15.038 16.538 17.5 13.5 17.5C10.462 17.5 8 15.038 8 12V11"
      stroke="#00A98F"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M8 12H13.5"
      stroke="#00A98F"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export default DeepSeekLogo;