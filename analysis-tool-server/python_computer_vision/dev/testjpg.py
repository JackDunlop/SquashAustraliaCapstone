import os
import cv2
from ultralytics import YOLO

def test_pose_estimation(image_path, model_path):
    try:
        # Load the YOLO model
        model = YOLO(model_path)
        print("Model loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")
        return

    # Load the image
    image = cv2.imread(image_path)
    if image is None:
        print("Failed to load image")
        return

    # Perform pose estimation
    detection = model.track(image, conf=0.80, show=False, verbose=False, persist=True, tracker="bytetrack.yaml", save=False)
    if detection and detection[0].keypoints is not None:
        keypoints = detection[0].keypoints.xy.cpu().numpy()
        print("Detected keypoints:")
        print(keypoints)
        for person in keypoints:
            for point in person:
                x, y = int(point[0]), int(point[1])
                cv2.circle(image, (x, y), 3, (0, 255, 0), -1)
    
    # Display the image with keypoints
    cv2.imshow('Pose Estimation', image)
    cv2.waitKey(0)
    cv2.destroyAllWindows()

    # Save the output image
    output_image_path = r'C:\Users\aledh\OneDrive\Desktop\Capstone2\SquashAustraliaCapstone\analysis-tool-server\pose_output.jpg'
    cv2.imwrite(output_image_path, image)
    print(f"Output image saved to {output_image_path}")

# Define the paths
image_path = r'C:\Users\aledh\OneDrive\Desktop\Capstone2\SquashAustraliaCapstone\analysis-tool-server\flatted.jpg'
model_path = r'C:\Users\aledh\OneDrive\Desktop\Capstone2\SquashAustraliaCapstone\analysis-tool-server\python_computer_vision\dev\models\yolov8m-pose.pt'

# Test the pose estimation on a single image
test_pose_estimation(image_path, model_path)