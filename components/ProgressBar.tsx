import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  variant?: 'default' | 'inverted';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, variant = 'default' }) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;

  const getColor = () => {
    if (percentage < 25) return 'bg-red-500';
    if (percentage < 50) return 'bg-yellow-500';
    if (percentage < 75) return 'bg-blue-500';
    return 'bg-green-500';
  };
  
  const trackBgColor = variant === 'inverted' ? 'bg-black/20' : 'bg-slate-600';

  return (
    <div className={`w-full ${trackBgColor} rounded-lg h-1`} title={`Уровень освоения: ${current}/${max}`}>
      <div
        className={`h-1 rounded-lg ${getColor()} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;