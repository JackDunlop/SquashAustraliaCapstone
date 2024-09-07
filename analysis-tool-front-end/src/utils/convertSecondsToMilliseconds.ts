/**
 * Convert seconds to milliseconds in HH:MM:SS format
 * 
 * @param numSeconds Number of seconds to convert
 * @returns String in HH:MM:SS format
 */
export const convertSecondsToMilliseconds = (numSeconds: number): string => {
    numSeconds = Number(numSeconds);

    const hours = Math.floor(numSeconds / 3600);
    const minutes = Math.floor((numSeconds % 3600) / 60);
    const seconds = Math.floor((numSeconds % 3600) % 60);
    const hoursDisplay = hours > 0 ? (hours >= 10 ? hours.toString() : '0' + hours) : '00';
    const minutesDisplay = minutes > 0 ? (minutes >= 10 ? minutes.toString() : '0' + minutes) : '00';
    const secondsDisplay = seconds > 0 ? (seconds >= 10 ? seconds.toString() : '0' + seconds) : '00';
    
    return `${hoursDisplay}:${minutesDisplay}:${secondsDisplay}`;
};