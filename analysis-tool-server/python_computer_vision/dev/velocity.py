import matplotlib.pyplot as plt
import numpy as np
import json
import re
import sys
import os
import cv2
import msgpack
from poseEstimation import getMatchIDFromVideo 
#from jointangles import getVideoPathFromDataPath

def extract_numeric_time(timestamp):
    numeric_part = re.findall(r"[-+]?\d*\.\d+|\d+", timestamp)[0]
    return float(numeric_part)

def calculateVelocity(p1, p0, delta_t):
    p1 = np.array(p1, dtype=float)
    p0 = np.array(p0, dtype=float)
    velocity = np.linalg.norm(p1 - p0) / delta_t
    return velocity


def plotVelocityAndSave(wristDataList, dataPath):
    times = [extract_numeric_time(entry["timestamp"]) for entry in wristDataList]
    velocities = [entry["velocity"] for entry in wristDataList]

    plt.figure(figsize=(10, 6))
    plt.plot(times, velocities, label="Velocity")
    plt.title("Velocity over Time")
    plt.xlabel("Time")
    plt.ylabel("Velocity")
    plt.grid(True)
    plt.tight_layout()


    match_id = getMatchIDFromVideo(dataPath)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', 'wristDataChart')
    os.makedirs(output_dir, exist_ok=True)
    filesave = os.path.join(output_dir, f'{match_id}.png')

    plt.savefig(filesave)
    #plt.show()

def getVideoPathFromDataPath(dataPath):
    baseName = os.path.basename(dataPath)
    match_id = os.path.splitext(baseName)[0]
    video_dir = os.path.join('..', '..', 'videos')
    video_path = os.path.join(video_dir, f'{match_id}.mp4')
    if not os.path.exists(video_path):
        print(f"Error: Video file {video_path} not found.")
        sys.exit(1)
    return video_path

def playVideo(videoPath, wristDataList):
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


def main():
    dataPath = sys.argv[1]
    leftOrRight = sys.argv[2].upper() + "_WRIST"
    #videoPath = getVideoPathFromDataPath(dataPath)  
    with open(dataPath, 'rb') as f:
        data = msgpack.unpack(f, raw=False)

    wristDataList = []
    for entry in data:
        if leftOrRight in entry['keypoints']:
            wrist_point = entry['keypoints'][leftOrRight]
            if wrist_point != [0, 0]:
                wristDataList.append({
                    "track_id": entry['track_id'],
                    "timestamp": entry['timestamp'],
                    "wrist_point": wrist_point,
                    "velocity": 0
                })

    for i in range(1, len(wristDataList)):
        p1 = wristDataList[i]["wrist_point"]
        p0 = wristDataList[i - 1]["wrist_point"]
        delta_t = extract_numeric_time(wristDataList[i]["timestamp"]) - extract_numeric_time(wristDataList[i - 1]["timestamp"])
        wristDataList[i]["velocity"] = calculateVelocity(p1, p0, delta_t)

    plotVelocityAndSave(wristDataList,dataPath)


if __name__ == "__main__":
    main()
