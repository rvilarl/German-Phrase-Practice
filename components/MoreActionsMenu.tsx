import React from 'react';

interface ButtonDef {
  key: string;
  label: string;
  // FIX: Changed JSX.Element to React.ReactElement to resolve JSX namespace issue.
  icon: React.ReactElement;
  action: (e: React.MouseEvent) => void;
}

interface MoreActionsMenuProps {
  buttons: ButtonDef[];
  onClose: () => void;
  theme: 'front' | 'back';
}

const MoreActionsMenu: React.FC<MoreActionsMenuProps> = ({ buttons, onClose, theme }) => {
  const themeClasses = theme === 'front' 
    ? 'bg-slate-700/90 backdrop-blur-sm border-slate-600' 
    : 'bg-slate-800/80 backdrop-blur-sm border-slate-600';
  
  const buttonThemeClasses = theme === 'front'
    ? 'text-slate-200 hover:bg-slate-600/80'
    : 'text-slate-200 hover:bg-black/30';

  return (
    <div
      onClick={e => e.stopPropagation()}
      className={`absolute bottom-full right-0 mb-2 w-56 rounded-lg shadow-lg border animate-fade-in z-20 ${themeClasses}`}
    >
      <ul className="p-1">
        {buttons.map((button) => (
          <li key={button.key}>
            <button
              onClick={(e) => {
                button.action(e);
                onClose();
              }}
              className={`w-full flex items-center px-3 py-2 text-left rounded-md transition-colors text-sm ${buttonThemeClasses}`}
            >
              <div className="w-5 h-5 mr-3 flex-shrink-0">{button.icon}</div>
              <span>{button.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MoreActionsMenu;
