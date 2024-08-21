import sys
import os
import cv2

def getMatchIDFromVideo(video_path):
    baseName = os.path.basename(video_path)
    match_id = os.path.splitext(baseName)[0]
    return match_id    

def extractFirstFrame(videoPath):
    cap = cv2.VideoCapture(videoPath)
    ret, frame = cap.read()
    if ret:
        match_id = getMatchIDFromVideo(videoPath)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        output_dir = os.path.join(script_dir, '..', '..', 'firstFrameExtracts')
        os.makedirs(output_dir, exist_ok=True)
        filesave = os.path.join(output_dir, f'{match_id}.jpg')
        cv2.imwrite(filesave, frame)
    cap.release()

def main():
    videoPath = sys.argv[1]
    extractFirstFrame(videoPath)

if __name__ == "__main__":
    main()
