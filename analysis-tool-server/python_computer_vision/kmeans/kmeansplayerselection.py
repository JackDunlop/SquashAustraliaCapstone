import sys
import os
import cv2
from ultralytics import YOLO
import numpy as np
from sklearn.cluster import KMeans
from PIL import Image
import json

''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** Custom Error ******************************************************************************************
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

class InvalidRequiredArgumentsError(ApplicationError):
    """Exception raised when two arguments have not been passed in."""
    def __init__(self, arguments, message="Must have two passed in arguments."):
        self.arguments = arguments[1]  
        self.message = message
        super().__init__(f"{message}: Arguments Passed in {self.arguments}")

class FailedToCaptureFrame(ApplicationError):
    """Exception raised when openCV fails to capture a video frame."""
    def __init__(self, file, message="Failed to capture video frame."):
        self.file = file
        self.message = message
        super().__init__(f"{message}: {file}")

class Arguments:
    def __init__(self, videoPath):
        self.videoPath = videoPath

    def printArguments(self):
        print(f"Video Path: {self.videoPath}")


    def checkArgumentLength(argv):
        if len(argv) == 2:
            args = Arguments(argv[1])
            #args.printArguments()
            return args
        else:
            raise InvalidRequiredArgumentsError(argv)
    
    def checkPathExists(self):
        if not os.path.isfile(self.videoPath):
            raise PathDoesNotExistError(self.videoPath)
''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** Detecting Two players ******************************************************************************************
    ********************************************************************************************************************************************************************************** 
'''
def readFrameWithTwoBBoxes(videoPath, model, classes, confThresh):
    cap = cv2.VideoCapture(videoPath)
    while True:
        ret, frame = cap.read()
        if not ret:
            cap.release()
            raise FailedToCaptureFrame(videoPath)
        
        results = model.predict(frame, classes=classes, conf=confThresh, show=False,verbose=False)
        for result in results:
            if len(result.boxes.xyxy) >= 2:
                cap.release()
                return frame, result
 

''' 
    **********************************************************************************************************************************************************************************
    *************************************************************************** Kmeans clustering  ******************************************************************************************
    ********************************************************************************************************************************************************************************** 
'''

class Clustering:
    def __init__(self, modelPath):
        if not os.path.exists(modelPath):
            import subprocess
            subprocess.run(['python', '-m', 'ultralytics', 'download', '--model', 'yolov8n.pt'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        self.model = YOLO(modelPath)
  

  # not used
    def firstFrameDetection(self, firstFrame):
        classes = [0]  
        confThresh = 0.6 
        results = self.model.predict(firstFrame, classes=classes, conf=confThresh, show=True)
        return results
    
    def cropPlayersOut(self, results, firstFrame):
        croppedImages = []
        for result in results:
            if len(result.boxes.xyxy) > 1:
                bbox1 = result.boxes.xyxy[0].tolist()
                if len(bbox1) == 4:
                    x1, y1, x2, y2 = map(int, bbox1)
                    pilImage = Image.fromarray(cv2.cvtColor(firstFrame, cv2.COLOR_BGR2RGB))
                    croppedImage1 = pilImage.crop((x1, y1, x2, y2))
                    #croppedImage1.save("bbox1_image.png") # wont need
                    croppedImages.append(croppedImage1)

                bbox2 = result.boxes.xyxy[1].tolist()
                if len(bbox2) == 4:
                    x1, y1, x2, y2 = map(int, bbox2)
                    pilImage = Image.fromarray(cv2.cvtColor(firstFrame, cv2.COLOR_BGR2RGB))
                    croppedImage2 = pilImage.crop((x1, y1, x2, y2))
                    #croppedImage2.save("bbox2_image.png")
                    croppedImages.append(croppedImage2)
        return croppedImages

    # maybe area to improve struggles with colours jeresy like black ect
    def enhanceImageColours(self, image):

        hsvImage = cv2.cvtColor(image, cv2.COLOR_RGB2HSV)
        
        # Increase the saturation and value components to enhance colors
        hsvImage[:, :, 1] = cv2.add(hsvImage[:, :, 1], 50)
        hsvImage[:, :, 2] = cv2.add(hsvImage[:, :, 2], 50)
        

        enhancedImage = cv2.cvtColor(hsvImage, cv2.COLOR_HSV2RGB)
        return enhancedImage

    def kmeans(self, image):
        topHalfImage = image[0:int(image.shape[0]/2), :]
        enhancedImage = self.enhanceImageColours(topHalfImage)
        

        #plt.imshow(enhancedImage)
        
        image2d = enhancedImage.reshape(-1, 3)
        
        kmeans = KMeans(n_clusters=2, random_state=0)
        kmeans.fit(image2d)
        labels = kmeans.labels_

        clusteredImage = labels.reshape(topHalfImage.shape[0], topHalfImage.shape[1])
        #plt.imshow(clusteredImage)
        
        cornerCluster = [clusteredImage[0, 0], clusteredImage[0, -1], clusteredImage[-1, 0], clusteredImage[-1, -1]]
        nonPlayerCluster = max(set(cornerCluster), key=cornerCluster.count)

        playerCluster = 1 - nonPlayerCluster

        kmeans.cluster_centers_[playerCluster]
        

        rgbColour = kmeans.cluster_centers_[playerCluster]
        #normalizedRgbColour = rgbColour / 255.0
        
        # flt, ax = plt.subplots(figsize=(2, 2)) 
        # ax.add_patch(plt.Rectangle((0, 0), 1, 1, color=normalizedRgbColour))
        # plt.show()  
        return rgbColour  
    

def main():
    #start_time = time.time()
    args = Arguments.checkArgumentLength(sys.argv)
    args.checkPathExists()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    models_dir = os.path.join(script_dir, 'models')
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)

    modelPath = os.path.join(models_dir, 'yolov8n.pt')
    classes = [0]  
    confThresh = 0.6 
    getPlayers = Clustering(modelPath)

    firstFrame, firstFramePlayerDetected = readFrameWithTwoBBoxes(args.videoPath, getPlayers.model, classes, confThresh)

    croppedImages = getPlayers.cropPlayersOut([firstFramePlayerDetected], firstFrame)

    playerOneRGB = getPlayers.kmeans(np.array(croppedImages[0])).astype(int).tolist()
    playerTwoRGB = getPlayers.kmeans(np.array(croppedImages[1])).astype(int).tolist()

    
   
      
    players =  {
        "PlayerOne": playerOneRGB,
        "PlayerTwo": playerTwoRGB
    }
    print(json.dumps(players, indent=2)) 

   

if __name__ == "__main__":
    main()
