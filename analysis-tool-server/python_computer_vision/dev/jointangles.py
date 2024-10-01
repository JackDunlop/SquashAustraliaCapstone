import matplotlib.pyplot as plt
import numpy as np
import json
import re
import sys
import os
import cv2
import msgpack
from poseEstimation import getMatchIDFromVideo

#from velocity import getVideoPathFromDataPath

def extract_numeric_time(timestamp):
    numeric_part = re.findall(r"[-+]?\d*\.\d+|\d+", timestamp)[0]
    return float(numeric_part)


def playVideo(videoPath):
    cap = cv2.VideoCapture(videoPath)
    if not cap.isOpened():
        print(f"Error: Could not open video {videoPath}")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break
    
        cv2.imshow("Video", frame)
        if cv2.waitKey(25) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

def calculateAngle(p1, p2, p3):
    p1 = np.array(p1)
    p2 = np.array(p2)
    p3 = np.array(p3)
    
    if np.linalg.norm(p1) == 0 or np.linalg.norm(p2) == 0 or np.linalg.norm(p3) == 0:
        return None

    v1 = p1 - p2
    v2 = p3 - p2
    
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    
    if norm_v1 == 0 or norm_v2 == 0:
        return None

    cos_theta = np.dot(v1, v2) / (norm_v1 * norm_v2)
    cos_theta = np.clip(cos_theta, -1.0, 1.0)
    
    angle_rad = np.arccos(cos_theta)
    angle_deg = np.degrees(angle_rad)
    
    return angle_deg


def calculateAngleJoints(keypointData, p1String, p2String, p3string, specifcJoint):
    p1 = keypointData[p1String]
    p2 = keypointData[p2String]
    p3 = keypointData[p3string]
    
    if any(np.array_equal(point, [0, 0]) for point in [p1, p2, p3]):
        keypointData[specifcJoint] = "Can't Calculate Angle" 
    else:
        angle = calculateAngle(p1, p2, p3)
        keypointData[specifcJoint] = angle 

def saveData(dataPath, angleDataList):
    match_id = getMatchIDFromVideo(dataPath)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', 'jointAngleCalculation')
    os.makedirs(output_dir, exist_ok=True)
    filesave = os.path.join(output_dir, f'{match_id}.json')
    with open(filesave, 'w') as f:
        json.dump(angleDataList, f, indent=2)

def print_progress(current, total):
  
    fraction = current / total
    percentage = round(fraction * 100)
    print(percentage)
    

def main():
    dataPath = sys.argv[1]
    
    with open(dataPath, 'rb') as f:
        data = msgpack.unpack(f, raw=False)

    onlyDataToExtract = [
        'LEFT_SHOULDER', 'RIGHT_SHOULDER', 'LEFT_ELBOW', 'RIGHT_ELBOW', 
        'LEFT_WRIST', 'RIGHT_WRIST', 'LEFT_HIP', 'RIGHT_HIP', 
        'LEFT_KNEE', 'RIGHT_KNEE', 'LEFT_ANKLE', 'RIGHT_ANKLE'
    ]
    
    angleDataList = []
    total_entries = len(data)
    processed_entries = 0

    for entry in data:
        extractedData = {}
        for keypoint in onlyDataToExtract:
            if keypoint in entry['keypoints']:
                keypointData = entry['keypoints'][keypoint]
            extractedData[keypoint] = keypointData
        
        if extractedData:  
            calculateAngleJoints(extractedData, 'LEFT_SHOULDER', 'LEFT_ELBOW', 'LEFT_WRIST', 'LEFT_ARM_ANGLE')
            calculateAngleJoints(extractedData, 'RIGHT_SHOULDER', 'RIGHT_ELBOW', 'RIGHT_WRIST', 'RIGHT_ARM_ANGLE')
            calculateAngleJoints(extractedData, 'LEFT_HIP', 'LEFT_KNEE', 'LEFT_ANKLE', 'LEFT_LEG_ANGLE')
            calculateAngleJoints(extractedData, 'RIGHT_HIP', 'RIGHT_KNEE', 'RIGHT_ANKLE', 'RIGHT_LEG_ANGLE')
            
            angleDataList.append({
                "track_id": entry['track_id'],
                "timestamp": entry['timestamp'], 
                'angles': extractedData
            })
               
        processed_entries += 1
        #print_progress(processed_entries, total_entries)

    saveData(dataPath, angleDataList)
    

if __name__ == "__main__":
    main()

