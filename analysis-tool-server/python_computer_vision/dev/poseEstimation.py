
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


def poseEstimation(videoPath,outputDataFolderPath):
    
    model_path = 'models/yolov8m-pose.pt'  
    model = YOLO(model_path) 
    confThresh = 0.80
    
    cap = initialiseVideoCapture(videoPath)
    
    if not cap:
         return
   
    frameData = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
    
        frame_resized = cv2.resize(frame, (640, 640))
        frameTimestamp = getFrameTimestamp(cap)
        detection = getDetection(model, frame_resized, confThresh)
        
        if detection:
            processDetection(detection, frameTimestamp, frameData,frame_resized)
        
    #     #clear
        # cv2.imshow('Frame', frame_resized)
        # if cv2.waitKey(1) & 0xFF == ord('q'):
        #     break
    
    finalizeVideoProcessing(cap, frameData,outputDataFolderPath,videoPath)
    


def initialiseVideoCapture(videoPath):
    cap = cv2.VideoCapture(videoPath)
    if not cap.isOpened():
        print(json.dumps("Error: Could not open video.", indent=2))
        return None
    return cap

def getFrameTimestamp(cap):
    frameTimestamp = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000  # Convert milliseconds to seconds
    return f"{frameTimestamp:.2f}s"

def getDetection(model, frame, confThresh):
    person = [0]
    return model.track(frame, classes=person, conf=confThresh, show=False, verbose=False, persist=True, tracker="bytetrack.yaml")

def processDetection(detection, frameTimestamp, frameData, frame):
    keypoints = detection[0].keypoints.xy
    if not detection[0].boxes:
        return

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
        if keypointName == "LEFT_SHOULDER":

            cv2.putText(frame, f"{track_id}", (x, y - 100), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 2)
        
    return keypointData

def calculateAngleJoints(keypointData, p1String, p2String, p3string, specifcJoint,frame):
    p1 = keypointData[p1String]
    p2 = keypointData[p2String]
    p3 = keypointData[p3string]
    
    if any(np.array_equal(point, [0, 0]) for point in [p1, p2, p3]):
        #print(p1,p2,p3)
        keypointData[specifcJoint] = "Can't Calculate Angle" 
    else:
        angle = calculateAngle(p1, p2, p3)
        keypointData[specifcJoint] = angle 
        if specifcJoint == 'LEFT_ARM_ANGLE':
            
            cv2.putText(frame, f"{specifcJoint}: {angle:.2f}", (p2[0], p2[1] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (124,252,0), 2)


def get_match_id_from_video(video_path):
    # Extract the filename without the extension
    base_name = os.path.basename(video_path)
    match_id = os.path.splitext(base_name)[0]
    return match_id            

def finalizeVideoProcessing(cap, frameData,outputDataFolderPath,videoPath):
    cap.release()
    cv2.destroyAllWindows()
    match_id = get_match_id_from_video(videoPath)
    with open(f'poseEstimationData/{match_id}.json', 'w') as f:
        json.dump(frameData, f, indent=2)
                   
def main():
    
    outputDataFolderPath = sys.argv[1]
    videoPath = sys.argv[2]
    poseEstimation(videoPath,outputDataFolderPath)
   
   

if __name__ == "__main__":
    main()




# OLD

        #     image2d1 = enhancedImage1.reshape(-1, 3)
        #     image2d2 = enhancedImage2.reshape(-1, 3)

        #     kmeans1 = KMeans(n_clusters=2, random_state=0)
        #     kmeans2 = KMeans(n_clusters=2, random_state=0)

        #     kmeans1.fit(image2d1)
        #     kmeans2.fit(image2d2)

        #     labels1 = kmeans1.labels_
        #     labels2 = kmeans2.labels_

        #     clusteredImage1 = labels1.reshape(enhancedImage1.shape[0], enhancedImage1.shape[1])
        #     clusteredImage2 = labels2.reshape(enhancedImage2.shape[0], enhancedImage2.shape[1])

        #     cornerCluster1 = [clusteredImage1[0, 0], clusteredImage1[0, -1], clusteredImage1[-1, 0], clusteredImage1[-1, -1]]
        #     cornerCluster2 = [clusteredImage2[0, 0], clusteredImage2[0, -1], clusteredImage2[-1, 0], clusteredImage2[-1, -1]]

        #     nonPlayerCluster1 = max(set(cornerCluster1), key=cornerCluster1.count)
        #     nonPlayerCluster2 = max(set(cornerCluster2), key=cornerCluster2.count)

        #     playerCluster1 = 1 - nonPlayerCluster1
        #     playerCluster2 = 1 - nonPlayerCluster2

        #     kmeans1.cluster_centers_[playerCluster1]
        #     kmeans2.cluster_centers_[playerCluster2]

        #     rgbColour1 = kmeans1.cluster_centers_[playerCluster1]
        #     rgbColour2 = kmeans2.cluster_centers_[playerCluster2]

            
        #     r1, g1, b1 = int(rgbColour1[0]), int(rgbColour1[1]), int(rgbColour1[2])
        #     print(f"{r1}, {g1}, {b1}")
        #     r2, g2, b2 = int(rgbColour2[0]), int(rgbColour2[1]), int(rgbColour2[2])
        #     print(f"{r2}, {g2}, {b2}")
        #     normalizedRgbColour1 = rgbColour1 / 255.0
        #     normalizedRgbColour2 = rgbColour2 / 255.0

        #    # Plot the images and color patches
        #     plt.figure(figsize=(12, 8))
            
            # # Original Image 1
            # plt.subplot(3, 3, 1)
            # plt.imshow(enhancedImage1)
            # plt.title('Player 1 - Original')
            # plt.axis('off')
            
            # # Original Image 2
            # plt.subplot(3, 3, 2)
            # plt.imshow(enhancedImage2)
            # plt.title('Player 2 - Original')
            # plt.axis('off')

        #     # Clustered Image 1
        #     plt.subplot(3, 3, 4)
        #     plt.imshow(clusteredImage1)
        #     plt.title('Player 1 - Clustered')
        #     plt.axis('off')

        #     # Clustered Image 2
        #     plt.subplot(3, 3, 5)
        #     plt.imshow(clusteredImage2)
        #     plt.title('Player 2 - Clustered')
        #     plt.axis('off')

        #     # RGB Color Patch for Player 1
        #     plt.subplot(3, 3, 7)
        #     plt.gca().add_patch(plt.Rectangle((0, 0), 1, 1, color=normalizedRgbColour1))
        #     plt.title(f'Color 1 ({r1},{g1},{b1})')
        #     plt.axis('off')

        #     # RGB Color Patch for Player 2
        #     plt.subplot(3, 3, 8)
        #     plt.gca().add_patch(plt.Rectangle((0, 0), 1, 1, color=normalizedRgbColour2))
        #     plt.title(f'Color 2 ({r2},{g2},{b2})')
        #     plt.axis('off')

            # Display the plot
            # plt.tight_layout()
            # plt.show()




# def enhanceImageColours(image):
#     hsvImage = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    
#     # Increase the saturation and value components to enhance colors
#     hsvImage[:, :, 1] = cv2.add(hsvImage[:, :, 1], 50)
#     hsvImage[:, :, 2] = cv2.add(hsvImage[:, :, 2], 50)
    
#     enhancedImage = cv2.cvtColor(hsvImage, cv2.COLOR_HSV2RGB)
#     return enhancedImage



# def processPlayerImage(frame, bbox):
#     croppedImage = cropImage(frame, bbox)
#     # topHalfImage = croppedImage[0:int(croppedImage.shape[0]/2), :]
#     # enhancedImage = enhanceImageColours(topHalfImage)
#     return croppedImage

# def getBoundingBox(box):
#     return list(map(int, box.tolist()))
    
# def cropImage(frame, bbox):
#     pilImage = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
#     croppedImage = pilImage.crop((bbox[0], bbox[1], bbox[2], bbox[3]))
#     return np.array(croppedImage)

# def croppedPlayers(results, frame):
    
#     for result in results:
#         if len(result.boxes.xyxy) > 1:
#             bbox1 = getBoundingBox(result.boxes.xyxy[0])
#             bbox2 = getBoundingBox(result.boxes.xyxy[1])
            
#             enhancedImage1 = processPlayerImage(frame, bbox1)
#             enhancedImage2 = processPlayerImage(frame, bbox2)
            
    