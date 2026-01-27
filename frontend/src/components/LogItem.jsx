import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
const cn = (...inputs) => twMerge(clsx(inputs));

// Lightweight log item renderer reused by the main App
export default function LogItem({ log }) {
  const className = cn(
    "p-2 rounded transition-all",
    log.type === 'error' ? 'bg-red-900/20 text-red-400' :
    log.type === 'agent' ? 'border-l-2 border-blue-500 bg-blue-500/5' :
    log.type === 'user' ? 'border-l-2 border-emerald-500 bg-emerald-500/5' :
    'bg-slate-700/30'
  );
  return (
    <div className={className}>
      <span className="text-slate-500 text-[10px] block mb-1">[{log.time}]</span>
      <div className="whitespace-pre-wrap">{log.message}</div>
    </div>
  );
}
