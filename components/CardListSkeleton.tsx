import React from 'react';

const CardListSkeleton: React.FC = () => (
    <div className="space-y-2 w-full animate-pulse">
        {[...Array(5)].map((_, index) => (
            <div key={index} className="p-3 rounded-lg flex items-start space-x-3 bg-slate-700/80">
                <div className="mt-1 w-5 h-5 rounded-md flex-shrink-0 bg-slate-800"></div>
                <div className="flex-grow space-y-2">
                    <div className="h-4 bg-slate-600 rounded w-3/4"></div>
                    <div className="h-3 bg-slate-600 rounded w-1/2"></div>
                </div>
            </div>
        ))}
    </div>
);

export default CardListSkeleton;
