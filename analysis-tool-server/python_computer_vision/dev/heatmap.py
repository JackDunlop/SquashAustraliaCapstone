import matplotlib.pyplot as plt
import numpy as np


def create_heatmap(ball_positions, court_shape):
    heatmap = np.zeros(court_shape, dtype=np.float32)
    for pos in ball_positions:
        heatmap[pos[1], pos[0]] += 1
    return heatmap

def plot_heatmap(heatmap):
    plt.imshow(heatmap, cmap='hot', interpolation='nearest')
    plt.colorbar()
    plt.show()

    