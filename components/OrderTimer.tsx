import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { formatMillisecondsToMinutesSeconds } from '../utils/time';

interface OrderTimerProps {
  startTime: number;
  className?: string;
}

const OrderTimer: React.FC<OrderTimerProps> = ({ startTime, className = '' }) => {
  const [elapsed, setElapsed] = useState(Date.now() - startTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const minutes = Math.floor(elapsed / 60000);
  const timerString = formatMillisecondsToMinutesSeconds(elapsed);

  const getTimerColor = () => {
    if (minutes >= 20) return 'bg-red-500 text-white shadow-lg';
    if (minutes >= 10) return 'bg-yellow-400 text-black shadow-md';
    return 'bg-brand-primary text-brand-secondary shadow-md ring-1 ring-black/5';
  };

  return (
    <div
      className={`flex items-center space-x-2 px-2 py-1 rounded-full text-lg font-bold border-2 border-white ${getTimerColor()} ${className}`}
    >
      <Clock size={20} />
      <span>{timerString}</span>
    </div>
  );
};

export default OrderTimer;
