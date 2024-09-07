import { selectPlayerColor } from './selectPlayerColor';

describe('selectPlayerColor', () => {
    let mockSetColor: jest.Mock;
    let mockRgbArray: number[][];

    beforeEach(() => {
        mockSetColor = jest.fn();
        mockRgbArray = [[], [], []];

        // Mock the EyeDropper API
        (window as any).EyeDropper = jest.fn().mockImplementation(() => ({
            open: jest.fn().mockResolvedValue({ sRGBHex: '#ff5733' }),
        }));
    });

    it('should set the color and update the rgbArray', async () => {
        await selectPlayerColor(0, mockSetColor, mockRgbArray);

        expect(mockSetColor).toHaveBeenCalledWith('#ff5733');
        expect(mockRgbArray[0]).toEqual([255, 87, 51]);
    });

    it('should handle different colors', async () => {
        (window as any).EyeDropper = jest.fn().mockImplementation(() => ({
            open: jest.fn().mockResolvedValue({ sRGBHex: '#00ff00' }),
        }));

        await selectPlayerColor(1, mockSetColor, mockRgbArray);

        expect(mockSetColor).toHaveBeenCalledWith('#00ff00');
        expect(mockRgbArray[1]).toEqual([0, 255, 0]);
    });

    it('should handle multiple players', async () => {
        await selectPlayerColor(2, mockSetColor, mockRgbArray);

        expect(mockSetColor).toHaveBeenCalledWith('#ff5733');
        expect(mockRgbArray[2]).toEqual([255, 87, 51]);
    });
});