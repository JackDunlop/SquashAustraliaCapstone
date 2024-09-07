import { copyColorToClipboard } from './copyColorToClipboard';

describe('copyColorToClipboard', () => {
    let writeTextMock: jest.Mock;
    let alertMock: jest.Mock;

    beforeAll(() => {
        writeTextMock = jest.fn();
        alertMock = jest.fn();
        Object.assign(navigator, {
            clipboard: {
                writeText: writeTextMock,
            },
        });
        global.alert = alertMock;
    });

    beforeEach(() => {
        writeTextMock.mockClear();
        alertMock.mockClear();
    });

    test('should copy RGB value to clipboard and show alert for First player', async () => {
        await copyColorToClipboard('First', '#64C8FF');
        expect(writeTextMock).toHaveBeenCalledWith('100, 200, 255');
        expect(alertMock).toHaveBeenCalledWith('Copied First Player RGB value: 100, 200, 255 to clipboard!');
    });

    test('should copy RGB value to clipboard and show alert for Second player', async () => {
        await copyColorToClipboard('Second', '#FF5733');
        expect(writeTextMock).toHaveBeenCalledWith('255, 87, 51');
        expect(alertMock).toHaveBeenCalledWith('Copied Second Player RGB value: 255, 87, 51 to clipboard!');
    });

    test('should handle lowercase hex values', async () => {
        await copyColorToClipboard('First', '#abcdef');
        expect(writeTextMock).toHaveBeenCalledWith('171, 205, 239');
        expect(alertMock).toHaveBeenCalledWith('Copied First Player RGB value: 171, 205, 239 to clipboard!');
    });

    test('should handle hex values without #', async () => {
        await copyColorToClipboard('Second', '123456');
        expect(writeTextMock).toHaveBeenCalledWith('18, 52, 86');
        expect(alertMock).toHaveBeenCalledWith('Copied Second Player RGB value: 18, 52, 86 to clipboard!');
    });
});