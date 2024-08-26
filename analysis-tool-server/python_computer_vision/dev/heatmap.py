import matplotlib.pyplot as plt
import numpy as np
import sys
import json


def create_heatmap(ball_positions, court_shape):
    heatmap = np.zeros(court_shape, dtype=np.float32)
    for pos in ball_positions:
        heatmap[pos[1], pos[0]] += 1
    return heatmap

def plot_heatmap(heatmap):
    plt.imshow(heatmap, cmap='hot', interpolation='nearest')
    plt.colorbar()
    plt.show()   


def main():
    if len(sys.argv) > 1:
        court_bounds_json = "".join(sys.argv[1:])
        court_bounds = json.loads(court_bounds_json)
        try:            
            print(f"Received courtBounds: {court_bounds}")
        except json.JSONDecodeError as e:
            print(f"Failed to decode JSON: {e}")
    

if __name__ == "__main__":
    main()
    
# WIP 