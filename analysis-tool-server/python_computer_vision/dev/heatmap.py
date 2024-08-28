import matplotlib.pyplot as plt
import numpy as np
import sys
import cv2
import json


def apply_homography(frame, src_points, width, height):
    dst_points = np.array([
        [0, 0],
        [width - 1, 0],
        [width - 1, height - 1],
        [0, height - 1]
    ], dtype=np.float32)

    H, status = cv2.findHomography(src_points, dst_points)
    transformed = cv2.warpPerspective(frame, H, (width, height))
    return transformed


def parse_court_bounds():    
    court_bounds_json = "".join(sys.argv[1:])
    court_bounds = json.loads(court_bounds_json)    
    points = np.array(court_bounds, dtype=np.float32)
    
    #  sort points
    points = points[points[:, 1].argsort()]    
    top_points = points[:2]  
    bottom_points = points[2:4]  
    
    top_left = top_points[np.argmin(top_points[:, 0])]   
    top_right = top_points[np.argmax(top_points[:, 0])]  
    bottom_left = bottom_points[np.argmin(bottom_points[:, 0])]   
    bottom_right = bottom_points[np.argmax(bottom_points[:, 0])]  

   
    ordered_points = np.array([top_left, top_right, bottom_right, bottom_left], dtype=np.float32)
    return ordered_points

def main():
    parse_court_bounds()     

if __name__ == "__main__":
    main()
