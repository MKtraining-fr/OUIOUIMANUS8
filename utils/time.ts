export const formatMillisecondsToMinutesSeconds = (milliseconds: number): string => {
  const clamped = Number.isFinite(milliseconds) ? Math.max(0, milliseconds) : 0;
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export const formatElapsedSince = (startTime: number, referenceTime: number = Date.now()): string =>
  formatMillisecondsToMinutesSeconds(Math.max(0, referenceTime - startTime));
