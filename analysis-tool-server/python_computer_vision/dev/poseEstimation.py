import sys
import os
import cv2
from ultralytics import YOLO
from enum import Enum
import numpy as np
import json
import msgpack
from heatmap import parse_court_bounds
#from heatmap import apply_homography, parse_court_bounds

class GetKeypoint(Enum):
    #NOSE:           int = 0
    #LEFT_EYE:       int = 1
    #RIGHT_EYE:      int = 2
    LEFT_EAR:       int = 3
    RIGHT_EAR:      int = 4
    LEFT_SHOULDER:  int = 5
    RIGHT_SHOULDER: int = 6
    LEFT_ELBOW:     int = 7
    RIGHT_ELBOW:    int = 8
    LEFT_WRIST:     int = 9
    RIGHT_WRIST:    int = 10
    LEFT_HIP:       int = 11
    RIGHT_HIP:      int = 12
    LEFT_KNEE:      int = 13
    RIGHT_KNEE:     int = 14
    LEFT_ANKLE:     int = 15
    RIGHT_ANKLE:    int = 16


def poseEstimation(videoPath):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, 'models')
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)
    model_path = os.path.join(models_dir, 'yolov8m-pose.pt') 
    model = YOLO(model_path) 
    confThresh = 0.80
    modelClass = [0]
    cap = initialiseVideoCapture(videoPath)
    if not cap:
        return
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    # Prepare output file path
    match_id = getMatchIDFromVideo(videoPath)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', 'poseOutputVideo')
    os.makedirs(output_dir, exist_ok=True)
    filesave = os.path.join(output_dir, f'{match_id}.mp4')  # change depending on codec

    # Use codec for required output
    fourcc = cv2.VideoWriter_fourcc(*'H264')  
    out = cv2.VideoWriter(filesave, fourcc, fps, (frame_width, frame_height))
    frameData = []
    #src_points = parse_court_bounds()
    while True:
        ret, frame = cap.read()
        if not ret:
            break        
        # Apply homography transformation to the frame
        #transform = apply_homography(frame, src_points, frame_width, frame_height)
        
        frame_resized = cv2.resize(frame, (640, 640))
        frameTimestamp = getFrameTimestamp(cap)

        detection = getDetection(model, frame, confThresh, modelClass)
        if detection is None:
            continue
        processDetection(detection, frameTimestamp, frameData, frame)
        out.write(frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    finaliseVideoProcessing(cap, frameData, videoPath)
    out.release()

def initialiseVideoCapture(videoPath):
    cap = cv2.VideoCapture(videoPath)
    if not cap.isOpened():
        print(json.dumps("Error: Could not open video.", indent=2))
        return None
    return cap

def getFrameTimestamp(cap):
    frameTimestamp = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000  
    return f"{frameTimestamp:.2f}s"

def getDetection(model, frame, confThresh, modelClass):

    return model.track(frame,
                        classes=modelClass,
                          conf=confThresh,
                            show=False,
                            verbose=False, 
                            persist=True, 
                            tracker="bytetrack.yaml",
                              save=False)


def processDetection(detection, frameTimestamp, frameData, frame):
   
    if detection[0].boxes is None or detection[0].boxes.id is None:
        return
    keypoints = detection[0].keypoints.xy
    track_ids = detection[0].boxes.id.cpu().numpy()  
    for track_id, kptArray in zip(track_ids, keypoints):
        keypointData = extractKeypointData(kptArray, frame, track_id)
 
        frameData.append({
            'track_id': int(track_id),
            'timestamp': frameTimestamp,
            'keypoints': keypointData            
        })

def extractKeypointData(kptArray, frame, track_id):
    kptArray = kptArray.cpu().numpy()
    keypointData = {}
    left_hip = None
    right_hip = None
    left_ear = None
    right_ear = None

    for pointIndex, point in enumerate(kptArray):
        x, y = int(point[0]), int(point[1])
        if x == 0 and y == 0:
            continue  # Skip keypoints that are (0, 0)
        if pointIndex == GetKeypoint.LEFT_HIP.value:
            left_hip = (x, y)
        elif pointIndex == GetKeypoint.RIGHT_HIP.value:
            right_hip = (x, y)
        elif pointIndex == GetKeypoint.LEFT_EAR.value:
            left_ear = (x, y)  # Store temp
        elif pointIndex == GetKeypoint.RIGHT_EAR.value:
            right_ear = (x, y)  
        else:
            if pointIndex in [k.value for k in GetKeypoint]:
                keypointName = GetKeypoint(pointIndex).name
                keypointData[keypointName] = [x, y]
                cv2.circle(frame, (x, y), 3, (0, 255, 0), -1)

    # Calculate the central HIP point if both hips are detected
    if left_hip and right_hip:
        central_hip = [
            int((left_hip[0] + right_hip[0]) / 2),
            int((left_hip[1] + right_hip[1]) / 2)
        ]
        keypointData['HIP'] = central_hip
        cv2.circle(frame, tuple(central_hip), 3, (255, 0, 0), -1)  
    if left_ear and right_ear:
        back_of_head = [
            int((left_ear[0] + right_ear[0]) / 2),
            int((left_ear[1] + right_ear[1]) / 2)
        ]
        keypointData['HEAD'] = back_of_head  # Add to keypointData
        cv2.circle(frame, tuple(back_of_head), 3, (0, 0, 255), -1)  
    return keypointData

def getMatchIDFromVideo(video_path):
    baseName = os.path.basename(video_path)
    match_id = os.path.splitext(baseName)[0]
    return match_id            

# def finaliseVideoProcessing(cap, frameData, videoPath):
#     cap.release()
#     cv2.destroyAllWindows()
#     match_id = getMatchIDFromVideo(videoPath)
#     script_dir = os.path.dirname(os.path.abspath(__file__))
#     output_dir = os.path.join(script_dir, '..', '..', 'poseEstimationData')
#     os.makedirs(output_dir, exist_ok=True)
#     filesave = os.path.join(output_dir, f'{match_id}.json')
#     with open(filesave, 'w') as f:
#         json.dump(frameData, f, indent=2)

def finaliseVideoProcessing(cap, frameData, videoPath):
    cap.release()
    cv2.destroyAllWindows()
    match_id = getMatchIDFromVideo(videoPath)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', 'poseEstimationData')
    os.makedirs(output_dir, exist_ok=True)
    filesave = os.path.join(output_dir, f'{match_id}.msgpack')
    with open(filesave, 'wb') as f:
        packed_data = msgpack.packb(frameData, use_bin_type=True)
        f.write(packed_data)

def load_pose_estimation_data(file_path):
    with open(file_path, 'rb') as f:
        packed_data = f.read()
        data = msgpack.unpackb(packed_data, raw=False)
    return data

def main():
    videoPath = sys.argv[1]
    poseEstimation(videoPath)     

if __name__ == "__main__":
    main()