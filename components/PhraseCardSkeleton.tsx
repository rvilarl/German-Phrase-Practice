import React from 'react';

const PhraseCardSkeleton: React.FC = () => {
  return (
    <div className="w-full max-w-md h-64 animate-pulse">
      <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl p-6 flex flex-col justify-between items-center text-center">
        <div className="flex-grow flex flex-col justify-center items-center w-full space-y-4">
            <div className="h-7 bg-slate-600 rounded w-3/4"></div>
            <div className="h-5 bg-slate-600 rounded w-1/2"></div>
        </div>
        <div className="h-7 w-1/3 bg-slate-600/50 rounded-full"></div>
      </div>
    </div>
  );
};

export default PhraseCardSkeleton;
