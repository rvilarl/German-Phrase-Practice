import React from 'react';
import { BiSolidUserVoice } from "react-icons/bi";
interface PracticeChatFabProps {
  onClick: () => void;
  disabled: boolean;
}

const PracticeChatFab: React.FC<PracticeChatFabProps> = ({ onClick, disabled }) => (
  <div className="fixed bottom-6 left-6 z-20">
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
      aria-label="Practice with AI"
    >
      <BiSolidUserVoice size="25px"/>
    </button>
  </div>
);

export default PracticeChatFab;
