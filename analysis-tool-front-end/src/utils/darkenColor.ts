export function darkenColor(color: string) {
    // Parse the color, darken it, and return it
    const match = color.match(/\d+/g);
    if (!match) {
        throw new Error("Invalid color format");
    }

    let [r, g, b] = match.map(Number);

    r = Math.max(0, r - 25);
    g = Math.max(0, g - 25);
    b = Math.max(0, b - 25);

    return `rgb(${r}, ${g}, ${b})`;
}