
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
from PIL import Image
import matplotlib.pyplot as plt
import time
import numpy as np
from sklearn.cluster import KMeans

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





def enhanceImageColours(image):
    hsvImage = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
    
    # Increase the saturation and value components to enhance colors
    hsvImage[:, :, 1] = cv2.add(hsvImage[:, :, 1], 50)
    hsvImage[:, :, 2] = cv2.add(hsvImage[:, :, 2], 50)
    
    enhancedImage = cv2.cvtColor(hsvImage, cv2.COLOR_HSV2RGB)
    return enhancedImage



def processPlayerImage(frame, bbox):
    croppedImage = cropImage(frame, bbox)
    # topHalfImage = croppedImage[0:int(croppedImage.shape[0]/2), :]
    # enhancedImage = enhanceImageColours(topHalfImage)
    return croppedImage

def getBoundingBox(box):
    return list(map(int, box.tolist()))
    
def cropImage(frame, bbox):
    pilImage = Image.fromarray(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
    croppedImage = pilImage.crop((bbox[0], bbox[1], bbox[2], bbox[3]))
    return np.array(croppedImage)

def croppedPlayers(results, frame):
    
    for result in results:
        if len(result.boxes.xyxy) > 1:
            bbox1 = getBoundingBox(result.boxes.xyxy[0])
            bbox2 = getBoundingBox(result.boxes.xyxy[1])
            
            enhancedImage1 = processPlayerImage(frame, bbox1)
            enhancedImage2 = processPlayerImage(frame, bbox2)
            
          

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
    model_path = 'models/yolov8n-pose.pt'  
    model = YOLO(model_path) 
    confThresh = 0.4
    cap = cv2.VideoCapture(videoPath)
    if not cap.isOpened():
        print("Error: Could not open video.")
        return

    frameData = []
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frameTimestamp = cap.get(cv2.CAP_PROP_POS_MSEC) / 1000  # Convert milliseconds to seconds
        timestampStr = f"{frameTimestamp:.2f}s"
        detection = model.predict(frame, classes=person, conf=confThresh, show=False, verbose=False)
        if detection:
            keypoints = detection[0].keypoints.xy
            boxes = detection[0].boxes
            cropped = croppedPlayers(detection, frame)
            
            for kptArray in keypoints:
                kptArray = kptArray.cpu().numpy()
                keypointData = {} 

                for pointIndex, point in enumerate(kptArray):
                    x, y = int(point[0]), int(point[1])
                    keypointName = GetKeypoint(pointIndex).name
                    keypointData[keypointName] = [x, y]

                

                frameData.append({
                    'timestamp': timestampStr,
                    'keypoints': [keypointData]  
                })

        # Optionally display the frame
        # cv2.imshow('Frame', frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

    import json
    with open('frame_data.json', 'w') as f:
        json.dump(frameData, f, indent=2)
    

      #print(f"Keypoint {keypoint_name} Point {pointIndex} in Array {arrayIndex}: ({x}, {y})")
                 ##   cv2.putText(frame, f'{pointIndex}', (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1, cv2.LINE_AA)
                    #cv2.circle(frame, (x, y), radius=3, color=(0, 255, 0), thickness=-1)
def main():


    # Handling Arguments
    args = Arguments.checkArgumentLength(sys.argv)
    args.checkPathExists()
   #outputFolderPath = args.checkOutputFolderExists()
    match_id = sys.argv[2]
    #print(match_id)
    # Handling Video
    start_time = time.time()
    
    videoFrames = readVideo(args.videoPath)
    
    # End timer
    end_time = time.time()
    
    elapsed_time = end_time - start_time
    print(f"Time taken to read video: {elapsed_time:.2f} seconds")
    # videoFrames, height, width = readVideo(args.videoPath)
    # #print(f"Number of frames read: {len(videoFrames)}")
    # print(f"Frame Dimensions: Width = {width}, Height = {height}")
   

if __name__ == "__main__":
    main()
