import numpy as np
import sys
import cv2
import json
import os
import matplotlib.pyplot as plt
import math
import msgpack

class HeatMap:    
    filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)),'courtData.json')
    
    def __init__(self,match_id): 
        self.maps = {}               
        if match_id is not None:
            self.maps[match_id] = {}

    def setMapLayout(self,match_id,points):        
        if match_id not in self.maps:
            self.maps[match_id] = {}      
        self.maps[match_id]['MapLayout'] = points       
    
    def getMapLayout(self, match_id):       
        return self.maps.get(match_id, {}).get('MapLayout') 
    
    def setCourtsize(self,match_id,lengths):        
        if match_id not in self.maps:
            self.maps[match_id] = {}
        self.maps[match_id]['CourtLengths'] = lengths

    def getCourtsize(self, match_id):         
        return self.maps.get(match_id, {}).get('CourtLengths')        

    def saveToFile(self):
        try:
            os.makedirs(os.path.dirname(HeatMap.filepath), exist_ok=True)            
            if os.path.exists(HeatMap.filepath):
                with open(HeatMap.filepath, 'r') as f:
                    existing_data = json.load(f)
            else:
                existing_data = {}
            
            existing_data.update(self.maps)

            with open(HeatMap.filepath, 'w') as f:
                json.dump(existing_data, f, indent=4)
            print(f"Data successfully saved to {HeatMap.filepath}")

        except Exception as e:
            print(f"Failed to save data: {e}")
            
    def load_from_file(self):
        if os.path.exists(HeatMap.filepath):
            try:                
                with open(HeatMap.filepath, 'r') as f:
                    loaded_data = json.load(f)
                    for match_id, match_data in loaded_data.items():
                        self.maps[match_id] = {
                            'MapLayout': match_data.get('MapLayout'),
                            'CourtLengths': match_data.get('CourtLengths')
                        }                    
            except Exception as e:
                print(f"Failed to load data: {e}")
        else:
            print(f"No data file found at {HeatMap.filepath}")

# Gets the size of each length of court in pixels 
def fourLengths(court_coordinates):      
    
    top_left = court_coordinates['top_left']
    top_right = court_coordinates['top_right']
    bot_left = court_coordinates['bot_left']
    bot_right = court_coordinates['bot_right']    
    
    top_width = calculate_distance(top_left, top_right)
    bot_width = calculate_distance(bot_left, bot_right)    
    left_height = calculate_distance(top_left, bot_left)
    right_height = calculate_distance(top_right, bot_right)        
    
    return {
        'top_width': top_width,
        'bottom_width': bot_width,
        'left_height': left_height,
        'right_height': right_height,
    }    
 
# Gets 4 corner coordinates of court, after working out which one
def fourPoints(court_coordinates):    
    points = np.array(court_coordinates, dtype=np.float32)
    centroid = calculate_centroid(points)
    
    top_left = None
    top_right = None
    bot_left = None
    bot_right = None
    
    for point in points:
        if point[0] <= centroid[0] and point[1] <= centroid[1]:
            
            if top_left is None or (point[0] < top_left[0] and point[1] < top_left[1]):
                top_left = point
        elif point[0] > centroid[0] and point[1] <= centroid[1]:
            
            if top_right is None or (point[0] > top_right[0] and point[1] < top_right[1]):
                top_right = point
        elif point[0] <= centroid[0] and point[1] > centroid[1]:
            
            if bot_left is None or (point[0] < bot_left[0] and point[1] > bot_left[1]):
                bot_left = point
        elif point[0] > centroid[0] and point[1] > centroid[1]:
            
            if bot_right is None or (point[0] > bot_right[0] and point[1] > bot_right[1]):
                bot_right = point    
    coords = {
        'top_left': top_left,
        'top_right': top_right,
        'bot_left': bot_left,
        'bot_right': bot_right
    }
    coords = {key: value.flatten().tolist() for key, value in coords.items()}  # to print clean
    return coords 

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
    point1 = np.array(point1)
    point2 = np.array(point2)
    # Euclidean distance
    return np.linalg.norm(point1 - point2)

def homography(fourpoints):
    flatmap = [
        [0, 0],
        [1200, 0],
        [1200, 600],
        [0, 600]
    ]    
    screen_coords = np.array([
        fourpoints['top_left'],
        fourpoints['top_right'],
        fourpoints['bot_right'],
        fourpoints['bot_left']
    ], dtype=np.float32)
    
    exit_coords = np.array(flatmap,dtype=np.float32)
    homography_matrix, status = cv2.findHomography(screen_coords, exit_coords)
    if status is None or np.sum(status) < 4:
        raise ValueError("Homography calculation failed. Check your input points.")
    return homography_matrix


def mapToCourt(pose_estimation_data, homography_matrix):    
    
    onlyDataToExtract = ['LEFT_ANKLE', 'RIGHT_ANKLE']

    mapped_points = {}
    
    for entry in pose_estimation_data:
        track_id = entry.get('track_id')  
        if not track_id:
            continue  

        mapListData = {}
        
        for keypoint in onlyDataToExtract:              
            if keypoint in entry['keypoints']:
                keypointData = entry['keypoints'][keypoint]
                mapListData[keypoint] = keypointData

        # If both left and right ankle data is available
        if 'LEFT_ANKLE' in mapListData and 'RIGHT_ANKLE' in mapListData:
            left_ankle = mapListData['LEFT_ANKLE']
            right_ankle = mapListData['RIGHT_ANKLE']
            
            player_position = np.array([
                (left_ankle[0] + right_ankle[0]) / 2,  
                (left_ankle[1] + right_ankle[1]) / 2,  
                1  # Homogeneous coordinate
            ]).reshape(-1, 1)
            
            # Apply homography
            mapped_position = np.dot(homography_matrix, player_position)            
            mapped_position /= mapped_position[2, 0]  # Normalize

            if track_id not in mapped_points:
                mapped_points[track_id] = []
            mapped_points[track_id].append((mapped_position[0, 0], mapped_position[1, 0]))

    return mapped_points

# main 1 - Before poseEstimation
def create_layout(court_data):       
    court_bounds = court_data.get('courtBounds') 
    match_id = court_data.get('match_id')
    myMap = HeatMap(match_id)
    if not court_bounds or not match_id:
        print("Invalid data: 'courtBounds' or 'match_id' missing", file=sys.stderr)
        sys.exit(1) 
    points = fourPoints(court_bounds)
    
    lengths = fourLengths(points)    
    myMap.setMapLayout(match_id, points)
    myMap.setCourtsize(match_id, lengths)
    myMap.saveToFile()
    

# # main 2 - After poseEstimation
def generate_map(datapath):
    match_id = sys.argv[3]
    players = sys.argv[4]    
    myMap = HeatMap(match_id)
    try:
        # Open the file in binary mode
        with open(datapath, 'rb') as f:
            data = msgpack.unpack(f, raw=False)

    except Exception as e:
        print(f"Failed to load file: {e}", file=sys.stderr)
        sys.exit(1)
    print('Binary data loaded, generating heatmap...')
    myMap.load_from_file()
    points = myMap.getMapLayout(match_id)
    lengths = myMap.getCourtsize(match_id)
    matrix = homography(points)
    mapMatrix = mapToCourt(data,matrix) 
    #print(mapMatrix)   
  
if __name__ == "__main__": 
    operation = sys.argv[1]

    if operation == "createLayout":                
        try:
            input_data = sys.stdin.read()
            data = json.loads(input_data)
            print(data)
        except json.JSONDecodeError as e:
            print(f"Failed to decode JSON: {e}", file=sys.stderr)
            sys.exit(1)

        create_layout(data)
    
    elif operation == "generateMap":
        datapath = sys.argv[2]
        
        generate_map(datapath)

    else:
        print(f"Unknown operation: {operation}", file=sys.stderr)
        sys.exit(1)
