
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

def readVideo(videoPath):
    person = [0]
    model_path = 'models\yolov8x-pose-p6.pt'  
    model = YOLO(model_path) 
    confThresh = 0.4
    cap = cv2.VideoCapture(videoPath)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
       
        frame_timestamp = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000  # Convert milliseconds to seconds
        timestamp_str = f"{frame_timestamp:.2f}s"
        
      
        detection = model.predict([frame], classes=person, conf=confThresh, show=False, verbose=False)
   
        if detection:
            keypoints = detection[0].keypoints
            boxes = detection[0].boxes
            
         
            for arrayIndex, kptArray in enumerate(keypoints.xy):
                print(f"Array {arrayIndex} at {timestamp_str}:")
                kptArray = kptArray.cpu().numpy() 
               # cv2.putText(frame, f'{arrayIndex}', (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1, cv2.LINE_AA)
                for point in kptArray: 
                    x, y = int(point[0]), int(point[1])
                    print(f"Keypoint from Array {arrayIndex}: ({x}, {y})")
                    
              
                    cv2.circle(frame, (x, y), radius=3, color=(0, 255, 0), thickness=-1)
        
        
        cv2.imshow('Frame', frame)
        
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()



def main():


    # Handling Arguments
    args = Arguments.checkArgumentLength(sys.argv)
    args.checkPathExists()
   #outputFolderPath = args.checkOutputFolderExists()
    match_id = sys.argv[2]
    #print(match_id)
    # Handling Video
    videoFrames = readVideo(args.videoPath)
    # videoFrames, height, width = readVideo(args.videoPath)
    # #print(f"Number of frames read: {len(videoFrames)}")
    # print(f"Frame Dimensions: Width = {width}, Height = {height}")
   

if __name__ == "__main__":
    main()
