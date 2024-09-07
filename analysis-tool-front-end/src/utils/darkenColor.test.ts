import { darkenColor } from "./darkenColor";

describe('darkenColor', () => {
  test('should darken the color by reducing each RGB component by 25', () => {
    expect(darkenColor('rgb(100, 150, 200)')).toBe('rgb(75, 125, 175)');
    expect(darkenColor('rgb(50, 50, 50)')).toBe('rgb(25, 25, 25)');
    expect(darkenColor('rgb(25, 25, 25)')).toBe('rgb(0, 0, 0)');
  });

  test('should not reduce RGB components below 0', () => {
    expect(darkenColor('rgb(10, 20, 30)')).toBe('rgb(0, 0, 5)');
    expect(darkenColor('rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
  });

  test('should handle edge cases', () => {
    expect(darkenColor('rgb(255, 255, 255)')).toBe('rgb(230, 230, 230)');
    expect(darkenColor('rgb(0, 0, 0)')).toBe('rgb(0, 0, 0)');
  });
});