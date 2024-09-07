import { convertSecondsToMilliseconds } from './convertSecondsToMilliseconds';

describe('convertSecondsToMilliseconds', () => {
    test('should convert seconds to HH:MM:SS format', () => {
        expect(convertSecondsToMilliseconds(3661)).toBe('01:01:01');
        expect(convertSecondsToMilliseconds(59)).toBe('00:00:59');
        expect(convertSecondsToMilliseconds(3600)).toBe('01:00:00');
        expect(convertSecondsToMilliseconds(0)).toBe('00:00:00');
    });

    test('should handle edge cases', () => {
        expect(convertSecondsToMilliseconds(86399)).toBe('23:59:59'); 
        expect(convertSecondsToMilliseconds(86400)).toBe('24:00:00'); 
    });

    test('should handle large numbers', () => {
        expect(convertSecondsToMilliseconds(90061)).toBe('25:01:01'); 
    });

    test('should handle invalid inputs gracefully', () => {
        expect(convertSecondsToMilliseconds(-1)).toBe('00:00:00'); 
        expect(convertSecondsToMilliseconds(NaN)).toBe('00:00:00'); 
    });
});