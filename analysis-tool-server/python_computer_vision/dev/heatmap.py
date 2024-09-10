import numpy as np
import sys
import cv2
import json
import os
import msgpack
from poseEstimation import getMatchIDFromVideo, initialiseVideoCapture, getFrameTimestamp


class HeatMap:    
    #filepath = os.path.join(os.path.dirname(os.path.abspath(__file__)),'courtData.json')
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

    for entry in pose_estimation_data:
        track_id = entry.get('track_id')  
        if not track_id:
            continue 
        if 'mapped_ankles' not in entry:
            entry['mapped_ankles'] = {}       
        
        for keypoint in onlyDataToExtract:              
            if keypoint in entry['keypoints']:
                x, y = entry['keypoints'][keypoint]
            
            print(f'Original {keypoint} coordinates: x={x}, y={y}')
            
            # Create homogeneous coordinates and apply homography
            keypoint_position = np.array([x, y, 1]).reshape(-1, 1)
            mapped_position = np.dot(homography_matrix, keypoint_position)
            mapped_position /= mapped_position[2, 0]          
            
            print(f'Mapped {keypoint} coordinates: x={mapped_position[0, 0]}, y={mapped_position[1, 0]}')

            # Store the transformed ankle keypoint
            entry['mapped_ankles'][keypoint] = {
                'x': mapped_position[0, 0],
                'y': mapped_position[1, 0]
            }
    return pose_estimation_data

def poseDisplay(videoPath,poseEstimationData):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', 'poseOutputVideo')
    match_id = getMatchIDFromVideo(videoPath)
    cap = initialiseVideoCapture(videoPath)
    if not cap:
        return None    
    
    # Capture video properties
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
   
    os.makedirs(output_dir, exist_ok=True)
    filesave = os.path.join(output_dir, f'{match_id}.mp4')
    fourcc = cv2.VideoWriter_fourcc(*'mp4v') 
    out = cv2.VideoWriter(filesave,fourcc, fps, (frame_width, frame_height))
    frameData = []  
    
    for entry in poseEstimationData:
        if isinstance(entry['timestamp'], str) and 's' in entry['timestamp']:
            entry['timestamp'] = float(entry['timestamp'].replace('s', ''))

    while True:
        ret, frame = cap.read()
        if not ret:
            break 

        timestamp = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000.0     
        for entry in poseEstimationData:           
            if np.isclose(float(entry['timestamp']), float(timestamp), atol=0.05):
                keypoints = entry.get('keypoints')
                if keypoints:
                    for keypoint_name, keypoint_coords in keypoints.items():
                        x_kp, y_kp = int(keypoint_coords[0]), int(keypoint_coords[1])
                        cv2.circle(frame, (x_kp, y_kp), 3, (0, 0, 255), -1)  # Red circle for original keypoints
                        cv2.putText(frame, keypoint_name, (x_kp, y_kp - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

                mapped_ankles = entry.get('mapped_ankles')
                if mapped_ankles:
                    for ankle_name, mapped_coords in mapped_ankles.items():
                        x_ankle, y_ankle = int(mapped_coords['x']), int(mapped_coords['y'])                        
                        
                        print(f'Mapped {ankle_name} coordinates: x={x_ankle}, y={y_ankle}')                        
                        # Check if the coordinates are within frame bounds
                        if 0 <= x_ankle < frame_width and 0 <= y_ankle < frame_height:
                            cv2.circle(frame, (x_ankle, y_ankle), 5, (0, 255, 0), -1)  # green circle
                        else:
                            print(f'{ankle_name} coordinates out of bounds: x={x_ankle}, y={y_ankle}')
        out.write(frame)
    cap.release()
    out.release()
    cv2.destroyAllWindows()
    print(f'Video saved at: {filesave}')
 
_map_storage = {}

def set_map_instance(match_id, instance):    
    if instance:
        _map_storage[match_id] = instance

def get_map_instance(match_id):
    instance = _map_storage.get(match_id, None)
    if instance is None:
        print(f"Error: HeatMap instance for match_id {match_id} not found.")
    return instance

def main(): 
    courtdataPath = sys.argv[1]
    posedataPath = sys.argv[2]
    videoPath = sys.argv[3]    
    try:
        courtBounds = json.loads(sys.stdin.read())  # Read courtBounds from stdin and parse as JSON
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from stdin: {e}")
        sys.exit(1)
    
    match_id = getMatchIDFromVideo(videoPath)
    
    myMap = HeatMap(match_id)   
    
    if not courtBounds or not match_id:
        print("Invalid data: 'courtBounds' or 'match_id' missing", file=sys.stderr)
        return False
    points = fourPoints(courtBounds)    
    lengths = fourLengths(points)     
    myMap.setMapLayout(match_id, points)    
    myMap.setCourtsize(match_id, lengths)
    try:
        # Open the file in binary mode
        with open(posedataPath, 'rb') as f:
            data = msgpack.unpack(f, raw=False)

    except Exception as e:
        print(f"Failed to load file: {e}", file=sys.stderr)
        sys.exit(1)
    matrix = homography(points)
    mapMatrix = mapToCourt(data,matrix)

    #poseDisplay(videoPath,mapMatrix)

if __name__ == "__main__":    
    main() 