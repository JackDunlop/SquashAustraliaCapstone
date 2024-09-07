/**
 * Opens the eye dropper tool and allows the user to select a color.
 * 
 * @param playerIndex - The index of the player whose color is being selected.
 * @param setColor - A function that sets the color of the player.
 * @param rgbArray - An array of RGB values for each player.
 * @returns A promise that resolves when the color has been selected.
 */
export async function selectPlayerColor(
    playerIndex: number,
    setColor: (color: string) => void,
    rgbArray: number[][]
): Promise<void> {
    const eyeDropper = new window.EyeDropper();

    const { sRGBHex } = await eyeDropper.open();

    const hex = sRGBHex.replace(/^#/, '');

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    rgbArray[playerIndex].push(r, g, b);

    setColor(sRGBHex);
}