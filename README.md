# Climate Data Viewer

## Overview
The **Climate Data Viewer** is a **Flask + React** web application designed to visualize climate model error metrics across different regions in Europe. It allows users to select:
- A **region**
- A **physical variable** (e.g., precipitation or temperature)
- An **error metric**

The application then fetches the corresponding dataset and displays the data points on an interactive **Leaflet map** with colored markers indicating significant effects from **Global Climate Models (GCMs) and Regional Climate Models (RCMs)**.

## **Architecture**
The application follows a **client-server** architecture, consisting of:

### **1. Backend (Flask API)**
Handles requests, processes CSV data, and serves JSON responses.
- **Framework:** Flask
- **Data Format:** CSV files stored in `/data/region/`
- **Endpoints:** Serve lists of available **regions, metrics, and data** for visualization.

### **2. Frontend (React + Leaflet)**
Provides a user interface for selecting options and visualizing data.
- **Framework:** React (Vite-based project setup)
- **UI Components:**
  - Dropdowns for selecting **region, variable, and metric**
  - **Leaflet** for interactive map visualization
  - **Dynamic color-coded markers** for representing error significance

## **Directory Structure**
```
project_root/
│-- backend/                 # Flask backend
│   ├── app.py               # Main Flask application
│   ├── data/                # Folder for CSV files
│   │   ├── AL/              # Region folders
│   │   │   ├── anova_effects_ppt_AL_metric_1_ACC.csv
│   │   │   ├── anova_effects_ppt_AL_metric_2_MSE.csv
│-- frontend/                # React frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── App.jsx          # Main React component
│   │   ├── index.html       # Entry point for the web app
│-- README.md                # This documentation
```

---

## **Backend: Flask API**
### **Setup & Installation**
#### 1️⃣ Install Dependencies
Navigate to the `backend/` folder and install required Python libraries:
```sh
pip install flask flask-cors pandas
```

#### 2️⃣ Run the Flask Server
```sh
python app.py
```
By default, the server runs on `http://127.0.0.1:5000/`.

### **API Endpoints**
#### **List Available Regions**
**Endpoint:** `GET /list_regions`
- **Example Response:**
  ```json
  { "regions": ["AL", "BI", "EA", "FR", "IP", "MD", "ME", "SC"] }
  ```

#### **List Metrics for a Region & Variable**
**Endpoint:** `GET /list_metrics?region=AL&physical_variable=ppt`
- **Example Response:**
  ```json
  { "metrics": ["ACC", "MSE", "RMSE"] }
  ```

#### **Load CSV Data for a Selected Metric**
**Endpoint:** `GET /load_csv?region=AL&physical_variable=ppt&metric=ACC`
- **Example Response:**
  ```json
  [
    {
      "Gridpoint": 1,
      "GCM_effect": 1,
      "RCM_effect": 1,
      "Interaction_effect": 1,
      "latitude": 44.125,
      "longitude": 5.125
    }
  ]
  ```

---

## **Frontend: React & Leaflet**
### **Setup & Installation**
#### 1️⃣ Install Dependencies
Navigate to the `frontend/` folder and install required packages:
```sh
npm install
```

#### 2️⃣ Start the Frontend Development Server
```sh
npm run dev
```
This will launch the app on `http://localhost:5173/`.

### **React Components & Functionality**
#### **Main Components**
| Component | Description |
|-----------|-------------|
| `App.jsx` | Main entry point, manages state, fetches API data |
| `RegionSelector.jsx` | Dropdown for selecting regions |
| `Leaflet Map` | Displays selected dataset on an interactive map |

#### **Map Features**
- Uses **Leaflet** to render an interactive map
- **Colored markers** indicate:
  - 🟡 `Interaction` (yellow)
  - 🔴 `Only RCM` (red)
  - 🔵 `Only GCM` (blue)
  - 🟣 `RCM and GCM` (purple)
  - 🟢 `None` (green)
- A **legend** is displayed below the map for reference.

---

## **How to Run the Full Application**
1️⃣ **Start the Flask Backend**
```sh
cd backend/
python app.py
```

2️⃣ **Start the React Frontend**
```sh
cd frontend/
npm run dev
```

3️⃣ **Open the Web App**
Visit `http://localhost:5173/` in your browser.

4️⃣ **Select a Region, Variable, and Metric**
- The map updates dynamically based on the selected dataset.

---

## **Troubleshooting & Debugging**
### **1️⃣ API Issues (Backend Not Responding)**
- Ensure the Flask server is running: `python app.py`
- Check for errors in the terminal logs
- Verify API responses in the browser via:
  ```sh
  http://127.0.0.1:5000/list_regions
  ```

### **2️⃣ Frontend Issues (React Not Loading)**
- Ensure dependencies are installed: `npm install`
- Restart the frontend server: `npm run dev`
- Open **Developer Console (F12 > Console)** to check for errors

### **3️⃣ Map Not Displaying Markers**
- Confirm that the API is correctly sending JSON data.
- Check the browser console for API call errors (`F12 > Network > Fetch`).
- Ensure proper **latitude/longitude** values in the JSON response.

