import matplotlib.pyplot as plt
import numpy as np
import sys
import cv2
import json

class HeatMap:
    def __init__(self):        
        self.maps = {}
        
    def setMapLayout(self, match_id, court_bounds):         
        centroid = calculate_centroid(court_bounds)  
        ordered_points = findPoints(court_bounds)        
        # Store as key
        self.maps[match_id] = ordered_points
        print(f"Stored courtBounds for match_id {match_id}: \n {ordered_points}")        
    
    def getMapLayout(self):
        return self.maps
    
    def getCourtBounds(self,match_id):
        ordered_points = self.maps.get(match_id)
        if ordered_points is not None:
            return np.array(ordered_points)  
        else:
            return "No data found for this match_id"        
    
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

def generate_heatmap(heatmap_data, width, height):    
    # Normalize the heatmap data
    heatmap = cv2.normalize(heatmap_data, None, 0, 255, cv2.NORM_MINMAX)
    heatmap = np.uint8(heatmap)
    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)

    # Display the heatmap
    plt.imshow(heatmap, extent=(0, width, 0, height), origin='lower')
    plt.title("Heatmap of Player Movement")
    plt.colorbar()
    plt.show()


def apply_homography(frame, ordered_points, width, height):
    try:
        dst_points = np.array([
            [0, 0],                 
            [width - 1, 0],         
            [width - 1, height - 1],
            [0, height - 1]         
        ], dtype=np.float32)

        H, status = cv2.findHomography(ordered_points, dst_points)
        if H is None:
            raise ValueError("Homography matrix computation failed")

        transformed_frame = cv2.warpPerspective(frame, H, (width, height))
        return transformed_frame
    
    except cv2.error as e:
        print(f"Error during homography transformation: {e}")
        raise 


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

