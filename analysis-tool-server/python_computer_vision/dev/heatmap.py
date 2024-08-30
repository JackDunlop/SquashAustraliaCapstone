import numpy as np
import sys
import cv2
import json
import os

class HeatMap:
    def __init__(self):        
        self.maps = {}
        
    def setMapLayout(self, match_id, court_bounds):         
        centroid = calculate_centroid(court_bounds) 
        ordered_points = findPoints(court_bounds)        
        # Store as key
        ordered_points = [p.tolist() for p in ordered_points]
        self.maps[match_id] = ordered_points       
        

        self.save_to_file(os.path.join(os.curdir, "python_computer_vision"), 'courtBounds.json') 
    
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

    return top_left, top_right, bot_left, bot_right   
    
# centre of court
def calculate_centroid(points):
    #print(np.mean(points, axis=0))
    return np.mean(points, axis=0)

def angle_from_centroid(point, centroid):
    dx = point[0] - centroid[0]
    dy = point[1] - centroid[1]
    angle = np.arctan2(dy, dx)
    return angle




def generate_heatmap(heatmap_data, frame_width, frame_height):
    # Normalize the heatmap data to the range [0, 255]
    heatmap_normalized = cv2.normalize(heatmap_data, None, 0, 255, cv2.NORM_MINMAX)
    heatmap_normalized = np.uint8(heatmap_normalized)

    # Apply a color map to the heatmap
    heatmap_colored = cv2.applyColorMap(heatmap_normalized, cv2.COLORMAP_JET)

    # Save or display the heatmap
    heatmap_output_path = 'heatmap_output.png'
    cv2.imwrite(heatmap_output_path, heatmap_colored)
    print(f"Heatmap saved to {heatmap_output_path}")


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
    try:        
        input_data = sys.stdin.read()        
        data = json.loads(input_data) 
        match_id = data['match_id']
        court_bounds = data['courtBounds']
        maps = HeatMap()
        maps.setMapLayout(match_id, court_bounds)

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        sys.exit(1)
    
if __name__ == "__main__":
    main()

