
''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** IMPORTS **********************************************************************************************
    **********************************************************************************************************************************************************************************
 '''

import sys
import os
import cv2
from ultralytics import YOLO
import supervision as sv
import mediapipe as mp
import datetime


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
    """Exception raised when two arguments have not been passed in."""
    def __init__(self, arguments, message="Must have two passed in arguments."):
        self.arguments = arguments[1:]  # skip the script name
        self.message = message
        super().__init__(f"{message}: Arguments Passed in {self.arguments}")



''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** HANDLING ARUGMENTS  **********************************************************************************
    ********************************************************************************************************************************************************************************** 
'''

class Arguments:
    def __init__(self, videoPath, uniqueIdentifier):
        self.videoPath = videoPath
        self.uniqueIdentifier = uniqueIdentifier

    def print_arguments(self):
        print(f"Video Path: {self.videoPath}")
        print(f"Unique Identifier: {self.uniqueIdentifier}")

    def checkArgumentLength(argv):
        if len(argv) == 3:
            args = Arguments(argv[1], argv[2])
           # args.print_arguments()
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

def readVideo(videoPath):
    cap = cv2.VideoCapture(videoPath)
    frames = []
    ret, frame = cap.read()
    if ret:
        height, width, _ = frame.shape
        frames.append(frame)
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frames.append(frame)
    cap.release()
    return frames, height, width

def saveVideo(ouputVideoFrames,outputVideoPath):
    fourcc = cv2.VideoWriter_fourcc(*'XVID')
    out = cv2.VideoWriter(outputVideoPath, fourcc, 24, (ouputVideoFrames[0].shape[1], ouputVideoFrames[0].shape[0]))
    for frame in ouputVideoFrames:
        out.write(frame)
    out.release()

''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** Tracking  ********************************************************************************************
    ********************************************************************************************************************************************************************************** 
'''

class Tracking:
    def __init__(self, modelPath):
        self.model = YOLO(modelPath)
        self.tracker = sv.ByteTrack()

    def detectFrames(self, frames):
        batchSize = 20
        person = [0] # From the pretained model 0 is the class for a person
        confThresh = 0.4 # 40%
        detections = []
        for i in range(0, len(frames), batchSize):
            detectionsBatch = self.model.predict(frames[i:i+batchSize],classes=person,conf=confThresh, show=False, verbose=False)
            detections += detectionsBatch
        return detections

    
     
    def objectTracks(self, frames):
         
         detections = self.detectFrames(frames)
         
         tracks = {"person":[]}
         
         for frameNum, detection in enumerate(detections):
             classNames = detection.names
          

             detectionSupervision = sv.Detections.from_ultralytics(detection)

             detectionWithTracks = self.tracker.update_with_detections(detectionSupervision)

             tracks["person"].append({})
             #print(tracks)

             for frameDetection in detectionWithTracks:
                 boundingBox = frameDetection[0].tolist()

                 trackingID = frameDetection[4]

                 tracks["person"][frameNum][trackingID] = {"bbox": boundingBox}



         return tracks
    
    '''
    **********************************************************************************************************************************************************************************
     *************************************************************************** Human Pose Estimation  ******************************************************************************************** 
    ********************************************************************************************************************************************************************************** 
    
    
    '''
    def drawPoseEstimation(self, videoFrames, tracking, height, width):
        outputFrames = []
        mpDrawing = mp.solutions.drawing_utils
        mpPose = mp.solutions.pose

        pose = mpPose.Pose( 
            min_detection_confidence=0.4,
            min_tracking_confidence=0.4)
        
        for frameNumer, frame in enumerate(videoFrames):
            frame = frame.copy()

            playerDict = tracking["person"][frameNumer]

            for trackingID, player in playerDict.items():
                boundaingBox = player["bbox"]
                x1, y1, x2, y2 = map(int, boundaingBox)

                playerFrame = frame[y1:y2, x1:x2]

                RGB = cv2.cvtColor(playerFrame, cv2.COLOR_BGR2RGB)
                results = pose.process(RGB)
                # https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/pose.md
                if results.pose_landmarks:
                    # Extract landmarks
                    landmarks = results.pose_landmarks.landmark

                    # Specific landmarks of interest
                    
                    # Head
                    head_landmark = landmarks[mpPose.PoseLandmark.NOSE]

                    # Shoulders
                    left_shoulder_landmark = landmarks[mpPose.PoseLandmark.LEFT_SHOULDER]
                    right_shoulder_landmark = landmarks[mpPose.PoseLandmark.RIGHT_SHOULDER]
                    
                    # Elbows
                    left_elbow_landmark = landmarks[mpPose.PoseLandmark.LEFT_ELBOW]
                    right_elbow_landmark = landmarks[mpPose.PoseLandmark.RIGHT_ELBOW]

                    #Wrists
                    left_wrists_landmark = landmarks[mpPose.PoseLandmark.LEFT_WRIST]
                    right_wrists_landmark = landmarks[mpPose.PoseLandmark.RIGHT_WRIST]

                    #Hips
                    left_hips_landmark = landmarks[mpPose.PoseLandmark.LEFT_HIP]
                    right_hips_landmark = landmarks[mpPose.PoseLandmark.RIGHT_HIP]

                    #Knees
                    left_knees_landmark = landmarks[mpPose.PoseLandmark.LEFT_KNEE]
                    right_knees_landmark = landmarks[mpPose.PoseLandmark.RIGHT_KNEE]


                    #Ankles
                    left_ankles_landmark = landmarks[mpPose.PoseLandmark.LEFT_ANKLE]
                    right_ankles_landmark = landmarks[mpPose.PoseLandmark.RIGHT_ANKLE]


                    # Print or store the coordinates for each player
                    print(f"Player {trackingID} - Head: ({head_landmark.x * height}, {head_landmark.y * width})")

                    # print(f"Player {trackingID} - Left Shoulder: ({left_shoulder_landmark.x}, {left_shoulder_landmark.y})")
                    # print(f"Player {trackingID} - Right Shoulder: ({right_shoulder_landmark.x}, {right_shoulder_landmark.y})")

                    # print(f"Player {trackingID} - Left Elbow: ({left_elbow_landmark.x}, {left_elbow_landmark.y})")
                    # print(f"Player {trackingID} - Right Elbow: ({right_elbow_landmark.x}, {right_elbow_landmark.y})")
                    
                    # print(f"Player {trackingID} - Left Wrist: ({left_wrists_landmark.x}, {left_wrists_landmark.y})")
                    # print(f"Player {trackingID} - Right Wrist: ({right_wrists_landmark.x}, {right_wrists_landmark.y})")

                    # print(f"Player {trackingID} - Left Hips: ({left_hips_landmark.x}, {left_hips_landmark.y})")
                    # print(f"Player {trackingID} - Right Hips: ({right_hips_landmark.x}, {right_hips_landmark.y})")

                    # print(f"Player {trackingID} - Left Knees: ({left_knees_landmark.x}, {left_knees_landmark.y})")
                    # print(f"Player {trackingID} - Right Knees: ({right_knees_landmark.x}, {right_knees_landmark.y})")

                    # print(f"Player {trackingID} - Left Ankles: ({left_ankles_landmark.x}, {left_ankles_landmark.y})")
                    # print(f"Player {trackingID} - Right Ankles: ({right_ankles_landmark.x}, {right_ankles_landmark.y})")
                    
                mpDrawing.draw_landmarks(
                playerFrame, results.pose_landmarks, mpPose.POSE_CONNECTIONS,
                landmark_drawing_spec=mpDrawing.DrawingSpec(color=(255, 0, 0), thickness=1, circle_radius=2),
                connection_drawing_spec=mpDrawing.DrawingSpec(color=(0, 255, 0), thickness=1, circle_radius=2))
    
                frame[y1:y2, x1:x2] = playerFrame

               
            outputFrames.append(frame)

        return outputFrames
        


def main():


    # Handling Arguments
    args = Arguments.checkArgumentLength(sys.argv)
    args.checkPathExists()
    outputFolderPath = args.checkOutputFolderExists()
    match_id = sys.argv[2]
    #print(match_id)
    # Handling Video
    videoFrames, height, width = readVideo(args.videoPath)
    #print(f"Number of frames read: {len(videoFrames)}")
    print(f"Frame Dimensions: Width = {width}, Height = {height}")
    #Track
    tracking = Tracking('models\yolov8n-pose.pt') # look into yolo 5 might be better 
    tracks = tracking.objectTracks(videoFrames)

    # Pose Estimation
    outputFrames = tracking.drawPoseEstimation(videoFrames, tracks, height, width)

    #print(f"Number of frames read with track: {len(outputFrames)}")

    saveVideo(outputFrames, f'outputVideos/{match_id}_data_output.avi')
    print(f"{match_id}_data_output.avi")

if __name__ == "__main__":
    main()
