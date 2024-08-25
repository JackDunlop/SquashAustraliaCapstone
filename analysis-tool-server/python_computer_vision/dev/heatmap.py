import matplotlib.pyplot as plt
import numpy as np
import sys

def create_heatmap(ball_positions, court_shape):
    heatmap = np.zeros(court_shape, dtype=np.float32)
    for pos in ball_positions:
        heatmap[pos[1], pos[0]] += 1
    return heatmap

def plot_heatmap(heatmap):
    plt.imshow(heatmap, cmap='hot', interpolation='nearest')
    plt.colorbar()
    plt.show()

def process_court_bounds(court_bounds):
    print("Received courtBounds:", court_bounds)


def main():
    court_bounds = sys.argv[12]
    process_court_bounds(court_bounds)

if __name__ == "__main__":
    main()
    
# WIP - aled 