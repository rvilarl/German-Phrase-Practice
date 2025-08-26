import React from 'react';
import AlertTriangleIcon from './icons/AlertTriangleIcon';
import LightbulbIcon from './icons/LightbulbIcon';

type MessageType = 'error' | 'warning' | 'advice';

interface FeedbackMessageProps {
    type: MessageType;
    message: string;
    className?: string;
}

const config = {
    error: {
        icon: AlertTriangleIcon,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30'
    },
    warning: {
        icon: AlertTriangleIcon,
        color: 'text-yellow-400',
        bg: 'bg-yellow-500/10',
        border: 'border-yellow-500/30'
    },
    advice: {
        icon: LightbulbIcon,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30'
    }
};

const FeedbackMessage: React.FC<FeedbackMessageProps> = ({ type, message, className }) => {
    const { icon: Icon, color, bg, border } = config[type];
    return (
        <div className={`flex items-center gap-x-3 p-3 rounded-lg text-sm ${color} ${bg} border ${border} ${className}`}>
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
        </div>
    )
};
export default FeedbackMessage;
