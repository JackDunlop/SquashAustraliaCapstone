import numpy as np
import sys
import cv2
import matplotlib.pyplot as plt
import matplotlib.animation as animation
import mapsController as maps
import json
import msgpack
from poseEstimation import getMatchIDFromVideo
import os


width,height = 640, 975  # 6.4m x 9.75m

def plotLines(player_data):
    fig, ax = plt.subplots() 
    ax.set_xlim(0, width)  # Width 
    ax.set_ylim(0, height)  # Height   
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

    # Add player names to the plot
    player1_name = f"{player_data['player1']['firstName']} {player_data['player1']['lastName']}"
    player2_name = f"{player_data['player2']['firstName']} {player_data['player2']['lastName']}"

    player1_line, = ax.plot([], [], label=player1_name, color='blue')  
    player2_line, = ax.plot([], [], label=player2_name, color='red')  

    # Add the legend
    ax.legend(handles=[player1_line, player2_line],bbox_to_anchor=(1, 0.5))    
    return fig, ax

def visualizeHeatmap(heatmap,match_id):
    # Apply Gaussian blur to the heatmap data
    blurred_heatmap = maps.apply_gaussian_blur(heatmap)
    fig, ax = plotLines()
    
    # 0-255 for color mapping
    heatmap_normalized = cv2.normalize(blurred_heatmap, None, 0, 255, cv2.NORM_MINMAX)    
    
    color_map = cv2.COLORMAP_HOT    
    
    heatmap_color = cv2.applyColorMap(heatmap_normalized.astype(np.uint8), color_map)
    flipped_heatmap_color = np.flipud(heatmap_color)    
    ax.imshow(flipped_heatmap_color, extent=[0, 640, 0, 975], aspect='equal', interpolation='nearest', alpha=0.5)    
    
    plt.title('Player Heatmap')
    plt.axis('off') 
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', 'heatmap')
    os.makedirs(output_dir, exist_ok=True)
    filesave = os.path.join(output_dir, f'{match_id}.png')

    plt.savefig(filesave)
    #plt.show()

# Image
def display2dMap(transformed_movements, match_id, playerData):
    fig, ax = plotLines(playerData)
    
    players = {}
    total_time = {}
    last_timestamp = None 

    for i, (timestamps, player_data) in enumerate(transformed_movements.items()):        
        timestamp = float(timestamps.strip('s'))
        if i == 0:
            last_timestamp = timestamp 
            continue
        time_diff = timestamp - last_timestamp
        
        for track_id, transformed_midpoint in player_data.items():
            
            if track_id not in total_time:
                total_time[track_id] = {'Q1': 0, 'Q2': 0, 'Q3': 0, 'Q4': 0}
            
            if track_id in players:
                players[track_id]['points'].append(transformed_midpoint)
                players[track_id]['line'].set_data(np.array(players[track_id]['points']).T)
            else:
                players[track_id] = {
                    'points': [transformed_midpoint],
                    'line': ax.plot(transformed_midpoint[0], transformed_midpoint[1], 'o-', label=f'Player {track_id}')[0]
                }
            
            x, y = transformed_midpoint            
            
            if x > 320 and y > 487.5:
                total_time[track_id]['Q1'] += time_diff
            elif x <= 320 and y > 487.5:
                total_time[track_id]['Q2'] += time_diff
            elif x <= 320 and y <= 487.5:
                total_time[track_id]['Q3'] += time_diff
            elif x > 320 and y <= 487.5:
                total_time[track_id]['Q4'] += time_diff   

                    
        last_timestamp = timestamp 

    for i, track_id in enumerate(total_time.keys()):
        track_id_str = str(track_id)  # Ensure track_id is treated as a string
        if track_id_str == '1':  # Player 1 on the left side
            ax.text(-500, 1000 - i * 120, f"Player {track_id} Q1: {total_time[track_id]['Q1']:.2f}s", fontsize=12, color='black')
            ax.text(-500, 950 - i * 120, f"Player {track_id} Q2: {total_time[track_id]['Q2']:.2f}s", fontsize=12, color='black')
            ax.text(-500, 0 - i * 120, f"Player {track_id} Q3: {total_time[track_id]['Q3']:.2f}s", fontsize=12, color='black')
            ax.text(-500, -50 - i * 120, f"Player {track_id} Q4: {total_time[track_id]['Q4']:.2f}s", fontsize=12, color='black')
        else:  # Player 2 on the right side
            ax.text(660, 1115 - i * 120, f"Player {track_id} Q1: {total_time[track_id]['Q1']:.2f}s", fontsize=12, color='black')
            ax.text(660, 1065 - i * 120, f"Player {track_id} Q2: {total_time[track_id]['Q2']:.2f}s", fontsize=12, color='black')
            ax.text(660, 125 - i * 120, f"Player {track_id} Q3: {total_time[track_id]['Q3']:.2f}s", fontsize=12, color='black')
            ax.text(660, 75 - i * 120, f"Player {track_id} Q4: {total_time[track_id]['Q4']:.2f}s", fontsize=12, color='black')   
    ax.set_title('2D Movement Map')
    
    # Player 1 Left side
    
    # Save the plot as a file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', '2dMap')
    os.makedirs(output_dir, exist_ok=True)
    filesave = os.path.join(output_dir, f'{match_id}.png')

    print(total_time)
    plt.savefig(filesave)
    plt.close(fig)

    return total_time

    
def animate2dMap(transformed_movements, match_id, playerData, speedup_factor=1.5, buffer_factor=1.05):
    fig, ax = plotLines(playerData)

    # Convert timestamps to floats and ensure sorted order
    timestamps = [float(ts.rstrip('s')) for ts in sorted(transformed_movements.keys())]

    # Precompute time intervals between consecutive timestamps
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
    
    # Total time spent in quadrants for each player
    total_time_in_quadrant = {
        track_id: {'Q1': 0.0, 'Q2': 0.0, 'Q3': 0.0, 'Q4': 0.0} for track_id in all_track_ids
    }

    # Initialize text display for quadrant times
    player_texts = {}
    for i, track_id in enumerate(sorted(all_track_ids, key=lambda x: str(x))):
        if str(track_id) == '1':  # Player 1
            player_texts[track_id] = {
                'Q1': ax.text(-500, 1000 - i * 120, f"Player {track_id} Q1: 0.00s", fontsize=12, color='black'),
                'Q2': ax.text(-500, 950 - i * 120, f"Player {track_id} Q2: 0.00s", fontsize=12, color='black'),
                'Q3': ax.text(-500, 0 - i * 120, f"Player {track_id} Q3: 0.00s", fontsize=12, color='black'),
                'Q4': ax.text(-500, -50 - i * 120, f"Player {track_id} Q4: 0.00s", fontsize=12, color='black')
            }
        else:  # Player 2
            player_texts[track_id] = {
                'Q1': ax.text(660, 1115 - i * 120, f"Player {track_id} Q1: 0.00s", fontsize=12, color='black'),
                'Q2': ax.text(660, 1065 - i * 120, f"Player {track_id} Q2: 0.00s", fontsize=12, color='black'),
                'Q3': ax.text(660, 125 - i * 120, f"Player {track_id} Q3: 0.00s", fontsize=12, color='black'),
                'Q4': ax.text(660, 75 - i * 120, f"Player {track_id} Q4: 0.00s", fontsize=12, color='black')
            }

   
    constant_interval = max(min(time_intervals), 0.01) * 1000

    # Keep track of previous timestamp
    previous_timestamp = timestamps[0]  

    def update(frame):
        nonlocal previous_timestamp
        
        current_timestamp = timestamps[frame]
        
        time_difference = current_timestamp - previous_timestamp
        if time_difference < 0:
            print(f"Warning: Negative time difference at frame {frame}")
            time_difference = 0 
        previous_timestamp = current_timestamp

        movement_data = precomputed_data[frame]

        for track_id, line in lines.items():
            if movement_data[track_id] is not None:
                x, y = movement_data[track_id]                
                line.set_data([x], [y])
                
                if x > 320 and y > 487.5:
                    total_time_in_quadrant[track_id]['Q1'] += time_difference
                elif x <= 320 and y > 487.5:
                    total_time_in_quadrant[track_id]['Q2'] += time_difference
                elif x <= 320 and y <= 487.5:
                    total_time_in_quadrant[track_id]['Q3'] += time_difference
                elif x > 320 and y <= 487.5:
                    total_time_in_quadrant[track_id]['Q4'] += time_difference
                
                player_texts[track_id]['Q1'].set_text(f"Player {track_id} Q1: {total_time_in_quadrant[track_id]['Q1']:.2f}s")
                player_texts[track_id]['Q2'].set_text(f"Player {track_id} Q2: {total_time_in_quadrant[track_id]['Q2']:.2f}s")
                player_texts[track_id]['Q3'].set_text(f"Player {track_id} Q3: {total_time_in_quadrant[track_id]['Q3']:.2f}s")
                player_texts[track_id]['Q4'].set_text(f"Player {track_id} Q4: {total_time_in_quadrant[track_id]['Q4']:.2f}s")
        
        return list(lines.values()) + [text for track_texts in player_texts.values() for text in track_texts.values()]

    total_frames = len(timestamps)
    
    ani = animation.FuncAnimation(fig, update, frames=total_frames, interval=constant_interval, repeat=False)
    
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', '2dMapVideo')
    os.makedirs(output_dir, exist_ok=True)

    video_filename = os.path.join(output_dir, f'{match_id}.mp4')

    try:
        ani.save(video_filename, writer='ffmpeg', dpi=200)
        print(f"Animation saved successfully at {video_filename}")
    except Exception as e:
        print(f"Failed to save animation: {e}")
    plt.show()


def main(): 
    mapType = sys.argv[1]
    posedataPath = sys.argv[2]
    videoPath = sys.argv[3]    
    players = sys.argv[4]
    
    
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

    myMap = maps.HeatMap(match_id)  

    # fixed dimensions in front end
    image_width,image_height = 1280, 720
    
    video_width, video_height = maps.get_video_dimensions(videoPath)
    # Resize courtBounds to match video size
    video_courtbounds = maps.resize_coordinates(courtBounds, image_width,image_height,video_width,video_height)
    sorted_points = maps.sorted_courtBounds(video_courtbounds)
    
    myMap.setMapLayout(match_id, sorted_points)    
    lengths = maps.courtLengths(sorted_points)    
    myMap.setCourtsize(match_id, lengths)        
    
    # 3d to flatmap tranformation
    H = maps.homography(sorted_points)       
    track_id = maps.assign_track_ids(data)

    movements = maps.extract_significant_movements(track_id)  

    player_data = json.loads(players)

    #  3 routes
    if(mapType == "display2dMap"):
        transformed_movements = maps.movement_homography(movements,H)   
        display2dMap(transformed_movements,match_id,player_data)

    elif(mapType == "animated2dMap"):
        transformed_movements = maps.movement_homography(movements,H)         
        animate2dMap(transformed_movements,match_id,player_data)

    elif(mapType == "visualizeHeatmap"):
        court_positions = maps.map_movements_to_court(movements, H)    
        heatmap = maps.accumulate_heatmap(court_positions, width, height)      
        visualizeHeatmap(heatmap,match_id)
    else:
        print("Something went wrong")
        sys.exit(1) 
   
if __name__ == "__main__": 
    main()

