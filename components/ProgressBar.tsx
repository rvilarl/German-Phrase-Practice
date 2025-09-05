import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  variant?: 'default' | 'inverted';
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, variant = 'default' }) => {
  const percentage = max > 0 ? (current / max) * 100 : 0;
  
  const trackColor = variant === 'inverted' ? 'bg-white/10 backdrop-blur-sm' : 'bg-slate-600/30 backdrop-blur-sm';
  const barColor = percentage < 33 ? 'bg-red-500/90' : percentage < 66 ? 'bg-yellow-400/90' : 'bg-green-500/90';
  const progressColor = variant === 'inverted' ? 'bg-white/80' : barColor;

  return (
    <div 
      className={`w-full ${trackColor} rounded-full h-1.5 overflow-hidden`} 
      title={`Уровень освоения: ${current}/${max}`}
    >
      <div
        className={`h-full rounded-full ${progressColor} transition-all duration-500`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export default ProgressBar;