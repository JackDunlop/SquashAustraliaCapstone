
''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** IMPORTS **********************************************************************************************
    **********************************************************************************************************************************************************************************
 '''

import sys
import os
import cv2
from ultralytics import YOLO
from enum import Enum
import time
import numpy as np
import json

''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** CUSTOM ERRORS ***************************************************************************************
    ********************************************************************************************************************************************************************************** 
'''

class ApplicationError(Exception):
    """Parent class for custom errors."""
    pass

class PathDoesNotExistError(ApplicationError):
    """Exception raised when the specified file does not exist."""
    def __init__(self, file, message="Files path does not exist, DO NOT PASS IN RELATIVE PATH, MUST PASS IN FULL PATH."):
        self.file = file
        self.message = message
        super().__init__(f"{message}: {file}")

class OutputFolderDoesNotExistError(ApplicationError):
    """Exception raised when the output folder does not exist."""
    def __init__(self, file, message="Output folder does not exist, you need a folder to store the output videos names outputVideos."):
        self.file = file
        self.message = message
        super().__init__(f"{message}: {file}")

class UniqueIdentifierIsntUnique(ApplicationError):
    """Exception raised when the passed unique identifier already existis."""
    def __init__(self, uniqueIdentifier, message="Unique identifier already existis. "):
        self.file = uniqueIdentifier
        self.message = message
        super().__init__(f"{message}: {uniqueIdentifier}")

class InvalidRequiredArgumentsError(ApplicationError):
    """Exception raised when three arguments have not been passed in."""
    def __init__(self, arguments, message="Must have three passed in arguments."):
        self.arguments = arguments[1:]  # skip the script name
        self.message = message
        super().__init__(f"{message}: Arguments Passed in {self.arguments}")



''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** HANDLING ARUGMENTS  **********************************************************************************
    ********************************************************************************************************************************************************************************** 
'''

class Arguments:
    def __init__(self, videoPath, uniqueIdentifier,videoDataOutPutPath):
        self.videoPath = videoPath
        self.uniqueIdentifier = uniqueIdentifier
        self.videoDataOutPutPath = videoDataOutPutPath

    def checkArgumentLength(argv):
        if len(argv) == 4:
            args = Arguments(argv[1], argv[2], argv[3])
            return args
        else:
            raise InvalidRequiredArgumentsError(argv)
    
    def checkPathExists(self):
        if not os.path.isfile(self.videoPath):
            raise PathDoesNotExistError(self.videoPath)
    
    def checkOutputFolderExists(self):
        currentScriptDirectory = os.path.dirname(os.path.abspath(__file__))
        outputFolderPath = os.path.join(currentScriptDirectory, "outputVideos")
        if not os.path.exists(outputFolderPath):
            raise OutputFolderDoesNotExistError(outputFolderPath)
        return outputFolderPath

    def checkFileIdentifierIsUnique(self, outputFolderPath):
        fileNames = [f for f in os.listdir(outputFolderPath) if os.path.isfile(os.path.join(outputFolderPath, f))]
        parsedFilenames = [filename.split('_')[0] for filename in fileNames]
        if self.uniqueIdentifier in parsedFilenames:
            raise UniqueIdentifierIsntUnique(self.uniqueIdentifier)
    
''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** VIDEO FILE  ******************************************************************************************
    ********************************************************************************************************************************************************************************** 
'''
    
class GetKeypoint(Enum):
    NOSE:           int = 0
    LEFT_EYE:       int = 1
    RIGHT_EYE:      int = 2
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

def poseEstimation(videoPath):
    model_path = 'models/yolov8m-pose.pt'  
    model = YOLO(model_path) 
    confThresh = 0.80
    modelClass = [0]
    cap = initialiseVideoCapture(videoPath)
    
    if not cap:
        return

    
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)

    match_id = getMatchIDFromVideo(videoPath)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', 'poseOutputVideo')
    os.makedirs(output_dir, exist_ok=True)
    filesave = os.path.join(output_dir, f'{match_id}.mp4')
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')  
    out = cv2.VideoWriter(filesave, fourcc, fps, (frame_width, frame_height))

    frameData = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame_resized = cv2.resize(frame, (640, 640))
        frameTimestamp = getFrameTimestamp(cap)
        detection = getDetection(model, frame, confThresh, modelClass)
        
        if detection is None:
            continue

        processDetection(detection, frameTimestamp, frameData, frame)

        
        out.write(frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break


    finalizeVideoProcessing(cap, frameData, videoPath)
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
        calculateAngleJoints(keypointData,'LEFT_SHOULDER','LEFT_ELBOW','LEFT_WRIST','LEFT_ARM_ANGLE',frame)
        calculateAngleJoints(keypointData,'RIGHT_SHOULDER','RIGHT_ELBOW','RIGHT_WRIST','RIGHT_ARM_ANGLE',frame)
        calculateAngleJoints(keypointData,'LEFT_HIP','LEFT_KNEE','LEFT_ANKLE','LEFT_LEG_ANGLE',frame)
        calculateAngleJoints(keypointData,'RIGHT_HIP','RIGHT_KNEE','RIGHT_ANKLE','RIGHT_LEG_ANGLE',frame)
        
        frameData.append({
            'track_id': int(track_id),
            'timestamp': frameTimestamp,
            'keypoints': keypointData
        })

def extractKeypointData(kptArray, frame, track_id):
    kptArray = kptArray.cpu().numpy()
    keypointData = {}
    for pointIndex, point in enumerate(kptArray):
        x, y = int(point[0]), int(point[1])
        keypointName = GetKeypoint(pointIndex).name
        keypointData[keypointName] = [x, y]
        cv2.circle(frame, (x, y), 3, (0, 255, 0), -1)
        # if keypointName == "LEFT_SHOULDER":
        #     cv2.putText(frame, f"{track_id}", (x, y - 100), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
        
    return keypointData

def calculateAngleJoints(keypointData, p1String, p2String, p3string, specifcJoint,frame):
    p1 = keypointData[p1String]
    p2 = keypointData[p2String]
    p3 = keypointData[p3string]
    
    if any(np.array_equal(point, [0, 0]) for point in [p1, p2, p3]):
        keypointData[specifcJoint] = "Can't Calculate Angle" 
    else:
        angle = calculateAngle(p1, p2, p3)
        keypointData[specifcJoint] = angle 
        # if specifcJoint == 'RIGHT_ARM_ANGLE':
        #     cv2.putText(frame, f"{specifcJoint}: {angle:.2f}", (p2[0], p2[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (124,252,0), 2)


def getMatchIDFromVideo(video_path):
    baseName = os.path.basename(video_path)
    match_id = os.path.splitext(baseName)[0]
    return match_id            

def finalizeVideoProcessing(cap, frameData, videoPath):
    cap.release()
    cv2.destroyAllWindows()
    match_id = getMatchIDFromVideo(videoPath)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, '..', '..', 'poseEstimationData')
    os.makedirs(output_dir, exist_ok=True)
    filesave = os.path.join(output_dir, f'{match_id}.json')
    with open(filesave, 'w') as f:
        json.dump(frameData, f, indent=2)


def call_human_pose(match_id):
    thisdir = os.curdir()
    video_dir = os.path.join(os.path.dirname(__file__), '..', 'videos')
    poseEstimation(video_dir)



def main():   

    # Handling Arguments
    args = Arguments.checkArgumentLength(sys.argv)
    args.checkPathExists()
    match_id = sys.argv[2]
    outputDataFolderPath = sys.argv[3]
    
    
    #start_time = time.time()
    
    poseEstimation(args.videoPath,outputDataFolderPath,match_id)
    
    # End timer
    #end_time = time.time()
    
   # elapsed_time = end_time - start_time
    #print(f"Time taken to read video: {elapsed_time:.2f} seconds")
    #print(f"{outputDataFolderPath}")

def main():
    videoPath = sys.argv[1]
    poseEstimation(videoPath)
   
   

if __name__ == "__main__":
    main()
