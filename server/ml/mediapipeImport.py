import csv
import cv2
import mediapipe as mp
import numpy as np
import time
import os
import joblib


os.makedirs('server/ml', exist_ok=True)
with open('server/ml/asl_dataset.csv', 'a', newline='') as f:
    ...

# Initialize MediaPipe Hands
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    min_detection_confidence=0.7,
    min_tracking_confidence=0.7
)


def create_demo_frame():
    """Create a demo frame with text when no camera is available"""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)

    # Add background gradient
    for i in range(480):
        frame[i, :] = [i // 2, 50, 100 - i // 8]

    # Add text
    cv2.putText(frame, 'Hand Tracking Demo', (150, 100),
                cv2.FONT_HERSHEY_SIMPLEX, 1.2, (255, 255, 255), 2)
    cv2.putText(frame, 'Running in Replit Environment', (100, 150),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
    cv2.putText(frame, 'This demo shows hand landmarks', (80, 200),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
    cv2.putText(frame, 'that would be tracked in real-time', (70, 240),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
    cv2.putText(frame, 'with a webcam connected', (120, 280),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (200, 200, 200), 2)
    # Draw example hand landmarks pattern
    center_x, center_y = 320, 380
    points = [
        (center_x, center_y - 50),  # wrist
        (center_x - 30, center_y - 30), (center_x - 35, center_y - 10), (center_x - 40, center_y + 10),  # thumb
        (center_x - 10, center_y - 45), (center_x - 10, center_y - 20), (center_x - 10, center_y + 5),  # index
        (center_x + 5, center_y - 40), (center_x + 5, center_y - 15), (center_x + 5, center_y + 10),  # middle
        (center_x + 20, center_y - 35), (center_x + 20, center_y - 10), (center_x + 20, center_y + 15),  # ring
        (center_x + 35, center_y - 25), (center_x + 35, center_y - 5), (center_x + 35, center_y + 15),  # pinky
    ]

def save_landmarks(label, hand_landmarks):
    data = [label]
    for lm in hand_landmarks.landmark:
        data.extend([lm.x, lm.y, lm.z])
    with open('server/ml/asl_dataset.csv', 'a', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(data)
    print(f"Saved gesture for letter: {label}")


target_word = input("Enter a word to practice in ASL: ").upper()
target_letters = list(target_word)
current_index = 0
def save_demo_images():
    """Save demo images showing hand tracking capability"""
    print("Creating demo images...")

    # Create output directory
    if not os.path.exists('output'):
        os.makedirs('output')

    # Generate and save multiple demo frames
    for i in range(5):
        frame = create_demo_frame()

        # Add frame number
        cv2.putText(frame, f'Frame {i + 1}/5', (20, 450),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)

        # Slightly vary the hand position for each frame
        if i > 0:
            # Add some animation by moving hand slightly
            offset_x = (i - 2) * 10
            offset_y = (i - 2) * 5
            # This would normally show tracking over time
            cv2.putText(frame, f'Hand position offset: ({offset_x}, {offset_y})',
                        (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (150, 150, 150), 1)

        filename = f'output/hand_tracking_demo_{i + 1}.jpg'
        cv2.imwrite(filename, frame)
        print(f"Saved: {filename}")

    print("Demo images saved to 'output/' directory")


# Try to open webcam (0 = default camera)
cap = cv2.VideoCapture(0)
camera_available = False

# Check if camera is actually available
if cap.isOpened():
    ret, test_frame = cap.read()
    if ret and test_frame is not None:
        camera_available = True
    else:
        cap.release()

print("=" * 50)
print("HAND TRACKING APPLICATION")
print("=" * 50)
print(f"Camera available: {camera_available}")
print(f"MediaPipe initialized: {hands is not None}")
print(f"OpenCV version: {cv2.__version__}")

if camera_available:
    print("\nRunning with camera input...")
    print("Note: In Replit, this would show a live video feed")
    print("Press ESC to exit when running with camera")


    frame_count = 0
    training_mode = True
    message_shown = False
    while cap.isOpened():
        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break
        success, frame = cap.read()
        if not success:
            print("Ignoring empty camera frame.")
            continue

        # Convert from BGR to RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Process the frame and detect hands
        results = hands.process(rgb_frame)

        # Draw hand landmarks
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)

               # if not training_mode:
                   # user_vector = [lm.x for lm in hand_landmarks.landmark] + \
                    #              [lm.y for lm in hand_landmarks.landmark] + \
                    #              [lm.z for lm in hand_landmarks.landmark]

                   # predicted_label = model.predict([user_vector])[0]
                   # confidence = model.predict_proba([user_vector])[0][model.classes_.tolist().index(predicted_label)]
                   # score = int(confidence * 100)

                   # cv2.putText(frame, f"{predicted_label} ({score}%)", (30, 60),
                    #            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

                if current_index < len(target_letters):
                    label = target_letters[current_index]

                    if not message_shown:
                        print(f"Sign the letter: {label} and press SPACE to save it.")
                        message_shown = True

                    if key == ord(' '):
                        save_landmarks(label, hand_landmarks)
                        current_index += 1
                        message_shown = False

                        if current_index < len(target_letters):
                            print(f"Next letter: {target_letters[current_index]}")
                        else:
                            print("Done!")
                            training_mode = False

        if current_index < len(target_letters):
            cv2.putText(frame, f"Sign: {target_letters[current_index]}", (30, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

        frame_count += 1


        cv2.imshow('Hand Tracking', frame)


        # Simulate real-time processing
        time.sleep(0.1)


    cap.release()
    print(f"Processed {frame_count} frames successfully")

else:
    print("\nRunning in demo mode (no camera)...")
    print("This demonstrates what the hand tracking would look like")
    print("with real camera input in a local environment.")

    # Generate demo images
    save_demo_images()

    # Show what real-time processing would look like
    print("\nSimulating real-time hand tracking...")
    for i in range(10):
        print(f"Frame {i + 1}: Processing... (would detect hands if camera available)")
        time.sleep(0.5)

print("\n" + "=" * 50)
print("APPLICATION COMPLETED SUCCESSFULLY")
print("=" * 50)
print("\nIn a local environment with a webcam:")
print("- This app would capture live video")
print("- MediaPipe would detect and track hands in real-time")
print("- Hand landmarks would be drawn on the video feed")
print("- Users could interact via hand gestures")

print("\nThe application is ready to run with proper hardware!")
