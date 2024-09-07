type Player = 'First' | 'Second';

/**
 * Copy the RGB value of the color to the clipboard and show an alert.
 * 
 * @param player - The player whose color is being copied.
 * @param color - The color to copy.
 * @returns A promise that resolves when the color has been copied.
 */
export async function copyColorToClipboard(player: Player, color: string) {
    const sRGBHex = color;
    
    const hex = sRGBHex.replace(/^#/, '');
  
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const rgbString = `${r}, ${g}, ${b}`;

    await navigator.clipboard.writeText(rgbString);

    alert(`Copied ${player} Player RGB value: ${rgbString} to clipboard!`);
  }