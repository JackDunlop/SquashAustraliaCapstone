import numpy as np
import sys
import cv2
import json
import os
import matplotlib.pyplot as plt
import math
from poseEstimation import load_pose_estimation_data

class HeatMap:
    def __init__(self):        
        self.maps = {}

    def setMapLayout(self, match_id, ordered_points):
        ordered_points_serializable = {key: value.tolist() for key, value in ordered_points.items()}        
        self.maps[match_id] = ordered_points_serializable
        print(f"Map layout for match_id {match_id} has been set.") 
    
    def getMapLayout(self):
        return self.maps
    
    def getCourtBounds(self, match_id):
        ordered_points = self.maps.get(match_id)
        if ordered_points is not None:
            return np.array(ordered_points)  
        raise ValueError(f"No data found for match_id {match_id}") 
    
    def save_to_file(self, directory, filename):    
        if not os.path.exists(directory):
            os.makedirs(directory)        
        filepath = os.path.join(directory, filename)
        with open(filepath, 'w') as f:
            json.dump(self.maps, f, indent=4)  
            print(f"Data saved to {filepath}")
        
    def load_from_file(self, directory, filename):
        filepath = os.path.join(directory, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r') as f:
                self.maps = json.load(f)
            print(f"Data loaded from {filepath}")
        else:
            print(f"No data file found at {filepath}")

def findPoints(points):
    points = np.array(points, dtype=np.float32)
    centroid = calculate_centroid(points)
    
    above_centroid = [p for p in points if p[1] > centroid[1]]
    below_centroid = [p for p in points if p[1] < centroid[1]]
    
    if above_centroid:        
        top_left = min(above_centroid, key=lambda p: (p[0], -p[1]))  # Smallest x, and highest y
        top_right = max(above_centroid, key=lambda p: (p[0], p[1]))    

    if below_centroid:
        bot_left = min(below_centroid, key=lambda p: (p[0], p[1]))  # Smallest x, and lowest y
        bot_right = max(below_centroid, key=lambda p: (p[0], -p[1]))

    return {
        'top_left': top_left,
        'top_right': top_right,
        'bot_left': bot_left,
        'bot_right': bot_right,
    } 

def get_heatmap_size(court_coordinates):
    top_left = court_coordinates['top_left']
    top_right = court_coordinates['top_right']
    bot_left = court_coordinates['bot_left']
    bot_right = court_coordinates['bot_right']

    # Widths
    top_width = calculate_distance(top_left, top_right)
    bottom_width = calculate_distance(bot_left, bot_right)
    # Heights
    left_height = calculate_distance(top_left, bot_left)
    right_height = calculate_distance(top_right, bot_right)

    # Average the widths and heights
    average_width = (top_width + bottom_width) / 2
    average_height = (left_height + right_height) / 2

    return int(average_width), int(average_height)

# centre of court
def calculate_centroid(points):
    #print(np.mean(points, axis=0))
    return np.mean(points, axis=0)

def angle_from_centroid(point, centroid):
    dx = point[0] - centroid[0]
    dy = point[1] - centroid[1]
    angle = np.arctan2(dy, dx)
    return angle

def calculate_distance(point1, point2):
    # Calculate the Euclidean distance between two points
    return np.linalg.norm(np.array(point1) - np.array(point2))



def generate_heatmap(maps, match_id, pose_estimation_data):
    # Get court layout
    court_bounds = maps.getCourtBounds(match_id)
    heatmap_width, heatmap_height = get_heatmap_size({
        "top_left": court_bounds[0],
        "top_right": court_bounds[1],
        "bot_left": court_bounds[2],
        "bot_right": court_bounds[3]
    })

    # Initialize the heatmap
    heatmap_data = np.zeros((heatmap_height, heatmap_width))

    # Accumulate keypoints into the heatmap
    for frame_data in pose_estimation_data:
        for keypoint in frame_data['keypoints'].values():
            x, y = keypoint
            if 0 <= x < heatmap_width and 0 <= y < heatmap_height:
                heatmap_data[int(y), int(x)] += 1

    # Normalize the heatmap data
    heatmap_data = normalize_heatmap(heatmap_data)

    # Visualize the heatmap
    plt.imshow(heatmap_data, cmap='hot', interpolation='nearest')
    plt.colorbar()
    plt.show()

def normalize_heatmap(heatmap_data):
    min_val = np.min(heatmap_data)
    max_val = np.max(heatmap_data)
    if max_val > min_val:
        normalized_heatmap = (heatmap_data - min_val) / (max_val - min_val)
    else:
        normalized_heatmap = heatmap_data  # No normalization needed if max_val == min_val
    return normalized_heatmap

def apply_homography(frame, ordered_points, frame_width, frame_height):
    # Define source and destination points for homography
    src_pts = np.array(ordered_points, dtype=np.float32)
    dst_pts = np.array([
        [0, 0],
        [frame_width - 1, 0],
        [frame_width - 1, frame_height - 1],
        [0, frame_height - 1]
    ], dtype=np.float32)

    # Compute the homography matrix
    H, _ = cv2.findHomography(src_pts, dst_pts)
    transformed_frame = cv2.warpPerspective(frame, H, (frame_width, frame_height))
    return transformed_frame

def main():    
    input_data = sys.stdin.read()
    try:
        data = json.loads(input_data)
        print(f"Received data: {data}")
    except json.JSONDecodeError as e:
        print(f"Failed to decode JSON: {e}", file=sys.stderr)
        sys.exit(1)

    court_bounds = data.get('courtBounds')   
    match_id = data.get('match_id')
    ordered_points = findPoints(court_bounds)    
    myMap = HeatMap()
    myMap.setMapLayout(match_id,ordered_points)
    
    
    width, height = get_heatmap_size(ordered_points)
    print(f"Heatmap Size: Width = {width}, Height = {height}")

if __name__ == "__main__":
    main()

