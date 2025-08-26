import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  variant?: 'default' | 'inverted';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, variant = 'default' }) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  
  const trackColor = variant === 'inverted' ? 'bg-black/20' : 'bg-slate-600';
  const barColor = percentage < 33 ? 'bg-red-500' : percentage < 66 ? 'bg-yellow-400' : 'bg-green-500';
  const progressColor = variant === 'inverted' ? 'bg-white/80' : barColor;

  return (
    <div className={`w-full ${trackColor} rounded-lg h-1`} title={`Уровень освоения: ${current}/${max}`}>
      <div
        className={`h-1 rounded-lg ${progressColor} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;