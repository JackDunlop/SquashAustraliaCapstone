// Define the EyeDropper interface
interface EyeDropper {
    open: () => Promise<{ sRGBHex: string }>;
}

// Extend the Window interface to include EyeDropper
interface Window {
    EyeDropper: {
        new(): EyeDropper;
    };
}