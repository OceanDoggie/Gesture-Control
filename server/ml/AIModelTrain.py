import csv
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.metrics import accuracy_score
import joblib  # for saving the model

# Load dataset
X = []
y = []

with open('asl_dataset.csv', 'r', newline='') as f:
    reader = csv.reader(f)
    for row in reader:
        y.append(row[0])  # label
        X.append([float(val) for val in row[1:]])  # landmarks

X = np.array(X)
y = np.array(y)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = KNeighborsClassifier(n_neighbors=3)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print(f"Model accuracy: {accuracy:.2f}")

# Save model
joblib.dump(model, 'asl_knn_model.pkl')
print("Model saved as asl_knn_model.pkl")

