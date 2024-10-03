import numpy as np
import sys
import cv2
import json
import msgpack
from poseEstimation import getMatchIDFromVideo
import matplotlib.pyplot as plt
import matplotlib.animation as animation


#  Set track_ids to only 1 or 2
def assign_track_ids(data):        
    track_id_1_keypoints = None
    track_id_2_keypoints = None
    keypoints_to_compare = [
        'LEFT_ANKLE', 'RIGHT_ANKLE', 'LEFT_SHOULDER', 'RIGHT_SHOULDER',
        'LEFT_WRIST','RIGHT_WRIST', 'LEFT_ELBOW','RIGHT_ELBOW', 'LEFT_KNEE','RIGHT_KNEE'
    ]
    
    for i, getKeyPoints in enumerate(data):
        keypoints = getKeyPoints['keypoints']

        # Collect valid keypoints for comparison
        valid_points = {name: (x, y) for name, (x, y) in keypoints.items() if name in keypoints_to_compare and x != 0 and y != 0}

        # cases where there are no valid keypoints
        if len(valid_points) == 0:            
            future_track_id = None
            for j in range(1, 10 + 1):
                if i + j >= len(data):
                    break  # Avoid index out of range
                future_frame = data[i + j]
                future_keypoints = future_frame['keypoints']
                valid_future_points = {name: (x, y) for name, (x, y) in future_keypoints.items() if name in keypoints_to_compare and x != 0 and y != 0}

                if len(valid_future_points) > 0:                    
                    closest_to_1_future = compute_closest_keypoint(valid_future_points, track_id_1_keypoints, keypoints_to_compare) if track_id_1_keypoints else float('inf')
                    closest_to_2_future = compute_closest_keypoint(valid_future_points, track_id_2_keypoints, keypoints_to_compare) if track_id_2_keypoints else float('inf')
                    
                    if closest_to_1_future < closest_to_2_future:
                        future_track_id = 1
                    else:
                        future_track_id = 2
                    break 

            if future_track_id == 1:
                getKeyPoints['track_id'] = 1
            elif future_track_id == 2:
                getKeyPoints['track_id'] = 2
            continue

        if track_id_1_keypoints is None:
            track_id_1_keypoints = valid_points
            getKeyPoints['track_id'] = 1
        elif track_id_2_keypoints is None:
            track_id_2_keypoints = valid_points
            getKeyPoints['track_id'] = 2
        else:            
            closest_to_1 = compute_closest_keypoint(valid_points, track_id_1_keypoints, keypoints_to_compare)
            closest_to_2 = compute_closest_keypoint(valid_points, track_id_2_keypoints, keypoints_to_compare)

            # Assign track ID based on closest individual keypoint
            if closest_to_1 < closest_to_2:
                getKeyPoints['track_id'] = 1
                track_id_1_keypoints = valid_points  
            else:
                getKeyPoints['track_id'] = 2
                track_id_2_keypoints = valid_points 
    return data

def compute_closest_keypoint(points1, points2, keypoints_to_compare):    
    closest_distance = float('inf')    
    for keypoint_name in keypoints_to_compare:
        if keypoint_name in points1 and keypoint_name in points2:
            dist = np.linalg.norm(np.array(points1[keypoint_name]) - np.array(points2[keypoint_name]))
            closest_distance = min(closest_distance, dist)
    return closest_distance

def get_video_dimensions(videoPath):
    cap = cv2.VideoCapture(videoPath)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    cap.release()
    return width, height

# Stores instance of Map
class HeatMap:
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

# Resize image size to video size
def resize_coordinates(courtBounds, image_width, image_height, video_width, video_height):    
    scale_width = video_width / image_width
    scale_height = video_height / image_height

    resized_courtBounds = []
    for coordinates in courtBounds:
        new_x = coordinates[0] * scale_width
        new_y = coordinates[1] * scale_height
        resized_courtBounds.append([new_x, new_y])

    return resized_courtBounds

#  min x, min y
def find_top_left(points, y_tolerance):    
    min_y = np.min(points[:, 1])    
    top_candidates = points[points[:, 1] <= min_y + y_tolerance]
    return top_candidates[np.argmin(top_candidates[:, 0])]

#  max x, max y
def find_bottom_right(points, y_tolerance):    
    max_y = np.max(points[:, 1])    
    bottom_candidates = points[points[:, 1] >= max_y - y_tolerance] 
    return bottom_candidates[np.argmax(bottom_candidates[:, 0])]
       
def sorted_courtBounds(courtBounds):
    points = np.array(courtBounds)  
    
    top_left = find_top_left(points, y_tolerance=10)  
    if top_left is not None:
        points = np.array([p for p in points if not np.array_equal(p, top_left)])

    bot_right = find_bottom_right(points, y_tolerance=10)
    if bot_right is not None:
        points = np.array([p for p in points if not np.array_equal(p, bot_right)])

    # Remove top left and bot right from list
    temp_points = np.array([point for point in points if not (np.array_equal(point, top_left) or np.array_equal(point, bot_right))])
    
    top_right = sorted(temp_points, key=lambda p: (p[1], -p[0]))[0]
    bot_left = sorted(temp_points, key=lambda p: (-p[1], p[0]))[0]

    # mid-left and mid-right remain
    remaining_points = np.array([point for point in temp_points if not (np.array_equal(point, top_right) or np.array_equal(point, bot_left))])

    if len(remaining_points) == 2:
        sorted_by_x = remaining_points[np.argsort(remaining_points[:, 0])]
        mid_left = sorted_by_x[0]
        mid_right = sorted_by_x[1]
    else:
        mid_left = mid_right = None
    
    coords = {
        'top_left': top_left,
        'top_right': top_right,
        'bot_right': bot_right,
        'bot_left': bot_left,
        'short_left': mid_left,
        'short_right': mid_right
    }
    coords = {key: value.flatten().tolist() for key, value in coords.items()}
    return coords
 
# Gets the size of each length of court in pixels 
def courtLengths(court_coordinates):     
    
    top_left = court_coordinates['top_left']
    top_right = court_coordinates['top_right']

    mid_left = court_coordinates['short_left']
    mid_right = court_coordinates['short_right']

    bot_left = court_coordinates['bot_left']
    bot_right = court_coordinates['bot_right']
    
    top_width = calculate_distance(top_left, top_right)
    bot_width = calculate_distance(bot_left, bot_right)
    left_height = calculate_distance(top_left,bot_left)
    right_height = calculate_distance(top_right,bot_right)

    topLeft_shortLeft = calculate_distance(top_left, mid_left)
    botLeft_shortLeft = calculate_distance(bot_left, mid_left)
    botRight_shortRight = calculate_distance(bot_right, mid_right)
    topRight_shortRight = calculate_distance(top_right, mid_right)
    
    short_width = calculate_distance(mid_left,mid_right)
    
    return {
        'top_width': top_width,
        'bottom_width': bot_width,
        'left_height':left_height,
        'right_height':right_height,
        'shortline_width': short_width 
    }  

def calculate_distance(point1, point2):
    point1 = np.array(point1)
    point2 = np.array(point2)
    # Euclidean distance
    return np.linalg.norm(point1 - point2)    

def calculate_ankle(ankles):
    if 'left_ankle' in ankles and 'right_ankle' in ankles:
        mid_x = (ankles['left_ankle'][0] + ankles['right_ankle'][0]) / 2
        mid_y = (ankles['left_ankle'][1] + ankles['right_ankle'][1]) / 2
        return [mid_x, mid_y]
    elif 'left_ankle' in ankles:
        return ankles['left_ankle']
    elif 'right_ankle' in ankles:
        return ankles['right_ankle']
    return None

def extract_significant_movements(pose_estimation_data, movement_threshold=5.0, start_time=None, end_time=None):
    onlyDataToExtract = ['LEFT_ANKLE', 'RIGHT_ANKLE']
    previous_ankle_positions = {}
    significant_movements = []    

    for entry in pose_estimation_data:
        track_id = entry.get('track_id')
        timestamp = entry.get('timestamp')

        if not track_id or not timestamp:
            continue
        try:
            timestamp_seconds = float(timestamp.rstrip('s'))
        except ValueError:
            continue

        if (start_time is not None and timestamp_seconds < start_time) or (end_time is not None and timestamp_seconds > end_time):
            continue

        total_movement = 0
        ankles = {}
        for keypoint in onlyDataToExtract:
            if keypoint in entry['keypoints']:
                x, y = entry['keypoints'][keypoint]
                if keypoint in previous_ankle_positions:
                    prev_x, prev_y = previous_ankle_positions[keypoint]
                    movement_distance = np.linalg.norm([x - prev_x, y - prev_y])
                    total_movement += movement_distance
                previous_ankle_positions[keypoint] = (x, y)
                ankles[keypoint.lower()] = [x, y]

        if total_movement > movement_threshold:
            midpoint = calculate_ankle(ankles)
            if midpoint:  # Only append if a midpoint exists
                significant_movements.append({
                    'track_id': track_id,
                    'timestamp': timestamp,
                    'mid_point': midpoint
                })
    return significant_movements


def homography(sortedcourtBounds):
    width = 640  # 6.4m x 9.75m court0
    height = 975
    short_line = 426
    
    flatmap = np.array([
        [0,0],                        
        [width,0],                  
        [width,height],  
        [0,height],           
        [0,short_line],                 
        [width,short_line]  
    ], dtype=np.float32)

    screen_coords = np.array([
        sortedcourtBounds['top_left'],
        sortedcourtBounds['top_right'],
        sortedcourtBounds['bot_right'],
        sortedcourtBounds['bot_left'],
        sortedcourtBounds['short_left'],
        sortedcourtBounds['short_right']
    ], dtype=np.float32)

    exit_coords = np.array(flatmap, dtype=np.float32)
    homography_matrix, status = cv2.findHomography(screen_coords, exit_coords)

    if status is None or np.sum(status) < 4:
        raise ValueError("Homography calculation failed. Check your input points.")
    # print("screen_coords",screen_coords)
    # print("flatmap",flatmap)
    return homography_matrix

# Transform coords
def apply_homography(H, points):
    ones = np.ones((points.shape[0], 1))
    points_homogeneous = np.hstack([points, ones])
    transformed_points_homogeneous = np.dot(H, points_homogeneous.T)
    return transformed_points_homogeneous[:2, :] / transformed_points_homogeneous[2, :]

# updated movements with new coords, timestamps as key
def movement_homography(movements, H):
    transformed_movements = {}

    for movement in movements:
        track_id = movement['track_id']
        timestamp = movement['timestamp']
        
        if timestamp not in transformed_movements:
            transformed_movements[timestamp] = {}
       
        midpoint = np.array([movement['mid_point']], dtype=float)
        transformed_midpoint = apply_homography(H, midpoint).flatten().tolist()

        # Store the track_id and its transformed midpoint under the corresponding timestamp
        transformed_movements[timestamp][track_id] = transformed_midpoint

    return transformed_movements

def map_movements_to_court(movements, homography_matrix):
    court_positions = []
    for movement in movements:
        midpoint = np.array([movement['mid_point']], dtype=float)  
        transformed_midpoint = apply_homography(homography_matrix, midpoint).flatten()  # Apply homography
        court_positions.append(transformed_midpoint)
    return court_positions

# Function to accumulate significant movements into a heatmap
def accumulate_heatmap(court_positions, court_width, court_height, radius=5, weights=None):
    heatmap = np.zeros((court_height, court_width), dtype=np.float32)
    for i, pos in enumerate(court_positions):
        x, y = int(pos[0]), int(pos[1])
        weight = weights[i] if weights else 1  # Use provided weight or default to 1
        
        # Ensure the indices are within bounds and increase an area around the point
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                nx, ny = x + dx, y + dy
                if 0 <= nx < court_width and 0 <= ny < court_height:
                    heatmap[ny, nx] += weight  # Increment by weight within the radius
    return heatmap

def apply_gaussian_blur(heatmap, kernel_size=21):
    # Apply Gaussian blur to the heatmap
    # Ensure kernel size is positive and odd
    if kernel_size <= 0:
        kernel_size = 21  # Default size
    if kernel_size % 2 == 0:
        kernel_size += 1  # Make kernel size odd if it is not
    blurred_heatmap = cv2.GaussianBlur(heatmap, (kernel_size, kernel_size), 0)
    return blurred_heatmap

def visualize_heatmap(heatmap):
    # Apply Gaussian blur to the heatmap data
    blurred_heatmap = apply_gaussian_blur(heatmap)    
    
    fig, ax = plotLines()
    
    # Normalize the blurred heatmap data to 0-255 for color mapping
    heatmap_normalized = cv2.normalize(blurred_heatmap, None, 0, 255, cv2.NORM_MINMAX)
    
    # Select the color map for the heatmap
    color_map = cv2.COLORMAP_HOT    
    
    heatmap_color = cv2.applyColorMap(heatmap_normalized.astype(np.uint8), color_map)
    flipped_heatmap_color = np.flipud(heatmap_color)    
    ax.imshow(flipped_heatmap_color, extent=[0, 640, 0, 975], aspect='equal', interpolation='nearest', alpha=0.5)    
    
    plt.title('Player Heatmap')
    plt.axis('off')
    plt.show()


def plotLines():
    fig, ax = plt.subplots() 
    ax.set_xlim(0, 640)  # Width 
    ax.set_ylim(0, 975)  # Height   
    ax.invert_yaxis()     
    ax.set_aspect('equal', adjustable='box') 
    
    ax.set_facecolor('lightgrey')
    # Create the inside lines
    ax.axhline(y=549, color='yellow', linestyle='-', linewidth=2)  
    ax.plot([320, 320], [549, 975], color='yellow', linestyle='-', linewidth=2)
    ax.plot([160,160],[549,709], color='yellow', linestyle='-', linewidth=2)
    ax.plot([0, 160], [709, 709], color='yellow', linestyle='-', linewidth=2)
    ax.plot([480,480],[549,709], color='yellow', linestyle='-', linewidth=2)
    ax.plot([640, 160], [709, 709], color='yellow', linestyle='-', linewidth=2)
    
    return fig, ax

# Image
def display2dMap(movements, H):
    fig,ax = plotLines()    
    players = {}  
    for movement in movements:
        track_id = movement['track_id']
        midpoint = np.array([movement['mid_point']], dtype=float) 
        
        transformed_midpoint = apply_homography(H, midpoint).flatten()  # Flatten to [x, y]        
        if track_id in players:            
            players[track_id]['points'].append(transformed_midpoint)            
            players[track_id]['line'].set_data(np.array(players[track_id]['points']).T)
        else:           
            players[track_id] = {
                'points': [transformed_midpoint],
                'line': ax.plot(transformed_midpoint[0], transformed_midpoint[1], 'o-', label=f'Player {track_id}')[0]  
            }
    ax.legend(loc='upper right')
    ax.set_title('2D Movement Map')
    plt.show()

# Video
def animate2dMap(transformed_movements, speedup_factor=1.0, buffer_factor=1.01):
    fig, ax = plotLines() 

    timestamps = [float(ts.rstrip('s')) for ts in sorted(transformed_movements.keys())]
   
    time_intervals = [(timestamps[i+1] - timestamps[i]) / speedup_factor * buffer_factor for i in range(len(timestamps) - 1)]
    time_intervals.append(0.1 / speedup_factor * buffer_factor)  # Add a small delay for the last frame    

    all_track_ids = set()
    for movement_data in transformed_movements.values():
        all_track_ids.update(movement_data.keys())
    
    lines = {track_id: ax.plot([], [], 'o-', label=f'Player {track_id}')[0] for track_id in all_track_ids}

    # Precompute data for each frame to optimize update speed
    precomputed_data = [
        {track_id: transformed_movements[f'{timestamp:.2f}s'].get(track_id, None) for track_id in all_track_ids}
        for timestamp in timestamps
    ]
    
    total_time_in_quadrant = {
        track_id: {'Q1': 0.0, 'Q2': 0.0, 'Q3': 0.0, 'Q4': 0.0} for track_id in all_track_ids
    }
    previous_timestamp = timestamps[0]
    
    player_texts = {}
    for i, track_id in enumerate(sorted(all_track_ids, key=lambda x: str(x))):  # Sorting to ensure consistent order
        track_id_str = str(track_id)  # Ensure track_id is treated as a string
        if track_id_str == '1':
            
            player_texts[track_id] = {
                'Q1': ax.text(-500, 1000 - i * 120, f"Player {track_id} Q1: {total_time_in_quadrant[track_id]['Q1']:.2f}s", fontsize=12, color='black'),
                'Q2': ax.text(-500, 950 - i * 120, f"Player {track_id} Q2: {total_time_in_quadrant[track_id]['Q2']:.2f}s", fontsize=12, color='black'),
                'Q3': ax.text(-500, 0 - i * 120, f"Player {track_id} Q3: {total_time_in_quadrant[track_id]['Q3']:.2f}s", fontsize=12, color='black'),
                'Q4': ax.text(-500, -50 - i * 120, f"Player {track_id} Q4: {total_time_in_quadrant[track_id]['Q4']:.2f}s", fontsize=12, color='black')
            }
        else:
            # Player 2 right side
            player_texts[track_id] = {
                'Q1': ax.text(660, 1115 - i * 120, f"Player {track_id} Q1: {total_time_in_quadrant[track_id]['Q1']:.2f}s", fontsize=12, color='black'),
                'Q2': ax.text(660, 1065 - i * 120, f"Player {track_id} Q2: {total_time_in_quadrant[track_id]['Q2']:.2f}s", fontsize=12, color='black'),
                'Q3': ax.text(660, 125 - i * 120, f"Player {track_id} Q3: {total_time_in_quadrant[track_id]['Q3']:.2f}s", fontsize=12, color='black'),
                'Q4': ax.text(660, 75 - i * 120, f"Player {track_id} Q4: {total_time_in_quadrant[track_id]['Q4']:.2f}s", fontsize=12, color='black')
            }
    constant_interval = max(min(time_intervals), 0.05) * 1000
    
    def update(frame):
        nonlocal previous_timestamp

        # Get the current timestamp and calculate the time difference from the previous frame
        current_timestamp = timestamps[frame]
        time_difference = current_timestamp - previous_timestamp        
        if time_difference < 0:
            print(f"Negative time difference {frame}: {time_difference} seconds")
            # Skip accumulating time if there's a negative time difference
            time_difference = 0
        previous_timestamp = current_timestamp
        # Get precomputed movement data for the current frame
        movement_data = precomputed_data[frame]

        for track_id, line in lines.items():
            if movement_data[track_id] is not None:
                x, y = movement_data[track_id]
                # Update the player's position on the map
                line.set_data([x], [y])

                # Determine which quadrant the player is in and accumulate the time
                if x > 320 and y > 487.5:
                    total_time_in_quadrant[track_id]['Q1'] += time_difference
                elif x <= 320 and y > 487.5:
                    total_time_in_quadrant[track_id]['Q2'] += time_difference
                elif x <= 320 and y <= 487.5:
                    total_time_in_quadrant[track_id]['Q3'] += time_difference
                elif x > 320 and y <= 487.5:
                    total_time_in_quadrant[track_id]['Q4'] += time_difference
                print(f"Player {track_id} times: Q1 = {total_time_in_quadrant[track_id]['Q1']}, Q2 = {total_time_in_quadrant[track_id]['Q2']}, Q3 = {total_time_in_quadrant[track_id]['Q3']}, Q4 = {total_time_in_quadrant[track_id]['Q4']}")
            else:
                # If no movement data is available, retain the last known position
                line.set_data(line.get_xdata(), line.get_ydata())

            # Update the text elements with the new times for each player
            player_texts[track_id]['Q1'].set_text(f"Player {track_id} Q1: {total_time_in_quadrant[track_id]['Q1']:.2f}s")
            player_texts[track_id]['Q2'].set_text(f"Player {track_id} Q2: {total_time_in_quadrant[track_id]['Q2']:.2f}s")
            player_texts[track_id]['Q3'].set_text(f"Player {track_id} Q3: {total_time_in_quadrant[track_id]['Q3']:.2f}s")
            player_texts[track_id]['Q4'].set_text(f"Player {track_id} Q4: {total_time_in_quadrant[track_id]['Q4']:.2f}s")

        # Return both the lines (points) and the text elements
        return list(lines.values()) + [text for track_texts in player_texts.values() for text in track_texts.values()]

    total_frames = len(timestamps)

    # Create the animation with the precomputed intervals
    ani = animation.FuncAnimation(fig, update, frames=total_frames, interval=constant_interval, repeat=False)

    ax.legend()
    plt.show()    


def main(): 
    courtdataPath = sys.argv[1]
    posedataPath = sys.argv[2]
    videoPath = sys.argv[3]    
    
    try:
        courtBounds = json.loads(sys.stdin.read())  # Read courtBounds from stdin and parse as JSON        
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from stdin: {e}")
        sys.exit(1)

    try:
        # Open the file in binary mode
        with open(posedataPath, 'rb') as f:
            data = msgpack.unpack(f, raw=False)
    except Exception as e:
        print(f"Failed to load file: {e}", file=sys.stderr)
        sys.exit(1)

    match_id = getMatchIDFromVideo(videoPath)
    if not courtBounds or not match_id:
        print("Invalid data: 'courtBounds' or 'match_id' missing", file=sys.stderr)
        sys.exit(1)

    myMap = HeatMap(match_id)    
    # fixed dimensions in front end
    image_width,image_height = 1280, 720    
    video_width, video_height = get_video_dimensions(videoPath)
    #print(video_width,video_height)

    # Resize courtBounds to match video size
    video_courtbounds = resize_coordinates(courtBounds, image_width,image_height,video_width,video_height)    
    #print(video_courtbounds)
    sorted_points = sorted_courtBounds(video_courtbounds)
    #print(sorted_points)
    myMap.setMapLayout(match_id, sorted_points)    
    lengths = courtLengths(sorted_points)
    myMap.setCourtsize(match_id, lengths)        
    
    # 3d to flatmap tranformation
    H = homography(sorted_points)
   
    track_id = assign_track_ids(data)
    movements = extract_significant_movements(track_id)
    
    #display2dMap(movements,H)
    transformed_movements = movement_homography(movements,H)
    court_positions = map_movements_to_court(movements, H)
    court_width, court_height = 640, 975
    heatmap = accumulate_heatmap(court_positions, court_width, court_height)
    
    #print(transformed_movements) 
    #animate2dMap(transformed_movements)   
    visualize_heatmap(heatmap)
    
   
if __name__ == "__main__":    
    main()