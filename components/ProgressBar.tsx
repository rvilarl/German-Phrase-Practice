import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  variant?: 'default' | 'inverted';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, variant = 'default' }) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  
  const trackBgColor = variant === 'inverted' ? 'bg-black/20' : 'bg-zinc-200 dark:bg-slate-600';

  return (
    <div className={`w-full ${trackBgColor} rounded-lg h-1`} title={`Уровень освоения: ${current}/${max}`}>
      <div
        className={`h-1 rounded-lg bg-amber-400 transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;