- Start the Flask backend
    python backend/app.py
- Open a second terminal and navigate to your frontend folder:
    (cd frontend && npm run dev)

python -m venv webapp
webapp\Scripts\activate
pip install flask flask-cors pandas matplotlib cartopy

Since the app seems relatively simple (a few selection inputs and displaying images), Flask might be lighter and easier to set up.

**FLASK backend**

flask: Web framework to build the API.
flask-cors: Allows frontend requests from different origins.
pandas: For handling CSV data.
matplotlib & cartopy: To generate maps.

Run backend/app.py and access http://127.0.0.1:5000/
    - 127.0.0.1 (localhost): This is a loopback IP address, meaning it refers to the local machine. When you access 127.0.0.1, you are essentially talking to your own computer.
    - 5000 (port number): This is the default port Flask runs on. Ports allow multiple services (web servers, databases, etc.) to run on the same machine without conflicts.
    - / (root route): This refers to the default endpoint of your web application. Any request sent to this address will be handled by the corresponding route in Flask.

**REACT frontend**

npx create-vite frontend --template react
cd frontend
npm install
npm install axios react-router-dom
    - axios: For making API requests to Flask.
    - react-router-dom: To manage page navigation.

✅ src/ → Contains your React components and styles.
✅ public/ → For static assets.
✅ index.html → The main HTML file.
✅ vite.config.js → Vite configuration.
✅ package.json → Lists dependencies.
✅ App.jsx & main.jsx → The main React files.

App.jsx is the root React component that defines the UI of the application.
    - Contains React UI components
    - State Management: Uses useState hook for the counter
    - Asset Imports: Includes logos (SVG files) and CSS styling
    - JSX Structure: Defines the component's visual layout
    - Interactive Element: Button that updates the count state
    - Hot Module Replacement (HMR): Mentioned in the edit message (auto-refresh during development)

main.jsx is the entry point, the starting point of your React application that connects React to the DOM.
    - Setup/configuration

*** Fetch and display regions from the Flask API ***

mkdir src/components
src/components/RegionSelector.jsx
 It will:
- Fetch regions from the Flask API (/list_regions).
- Display a dropdown menu for the user to select a region.
- Pass the selected region to the parent component (Calls onRegionSelect(region) whenever the user selects a region (so the parent component gets updated).)

 Integrate RegionSelector.jsx in App.jsx:
 ```
import { useState } from "react";
import RegionSelector from "./components/RegionSelector";

function App() {
    const [selectedRegion, setSelectedRegion] = useState("");

    return (
        <div>
            <h1>Climate Data Viewer</h1>
            <RegionSelector onRegionSelect={setSelectedRegion} />
            {selectedRegion && <p>Selected Region: {selectedRegion}</p>}
        </div>
    );
}

export default App;
 ```
Now App.jsx
- Uses the RegionSelector component to let users select a region.
- Stores the selected region in useState.
- Displays the selected region on the screen.


*PostgreSQL*

psql -U postgres

CREATE DATABASE climate_data;

\c climate_data;

CREATE USER climate_user WITH PASSWORD '***';

GRANT ALL PRIVILEGES ON DATABASE climate_data TO climate_user;
GRANT CONNECT ON DATABASE climate_data TO climate_user;
GRANT USAGE ON SCHEMA public TO climate_user;
GRANT INSERT, SELECT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO climate_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, SELECT, UPDATE, DELETE ON TABLES TO climate_user;
GRANT USAGE, SELECT, UPDATE ON SEQUENCE climate_metrics_id_seq TO climate_user;

CREATE TABLE climate_metrics (
    id SERIAL PRIMARY KEY,
    gridpoint INTEGER NOT NULL,
    gcm_effect INTEGER NOT NULL,
    rcm_effect INTEGER NOT NULL,
    interaction_effect INTEGER NOT NULL,
    min_gcm TEXT,
    min_rcm TEXT,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    region TEXT NOT NULL,
    physical_variable TEXT NOT NULL,
    metric_abbreviation TEXT NOT NULL
);


**DEPLOYING ON AWS**

***SERVERLESS***
With serverless computing (like AWS Lambda), you don't have to provision, maintain, or manage the underlying servers. AWS handles the infrastructure for you. Your code 
runs only when needed (triggered by events like an API call) rather than running continuously. This means you only pay for the compute time your code actually uses. 
The platform automatically scales your functions to handle increased load, without any manual intervention from your side.
Because you're not paying for idle server time, serverless can be more cost-effective for applications with variable or unpredictable traffic.

| Aspect                  | **Option 1: EC2 + RDS + S3**                                                                 | **Option 3: Serverless (Lambda + API Gateway + DynamoDB + S3)**                                                   |
|-------------------------|---------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| **Backend Hosting**     | **EC2 Instance:** You manage a virtual machine running your Flask app.                      | **AWS Lambda:** Your Flask app (or a reworked version) runs as serverless functions that trigger on demand.       |
| **Database**            | **Amazon RDS (PostgreSQL):** A managed relational database.                                 | **Amazon DynamoDB:** A managed NoSQL database, which may require changing your data model if you're used to SQL.    |
| **Management Overhead** | **Higher:** You need to manage server configuration, updates, and scaling for the EC2 instance. | **Lower:** AWS manages the underlying servers. You focus on writing your code and configuring triggers.           |
| **Scalability**         | **Manual/Custom:** While you can scale EC2, it often requires more configuration and monitoring. | **Automatic:** Lambda functions automatically scale with demand.                                                  |
| **Cost Model**          | **Fixed + Variable:** You pay for the EC2 instance continuously, regardless of usage.         | **Usage-Based:** You pay only for the actual compute time when your Lambda functions run, potentially reducing cost. |
| **Flexibility & Control** | **High:** Full control over the operating system and environment.                         | **Less Control:** Limited to what the serverless platform allows, which may require adjusting your app's architecture.  |


- **Option 1 (EC2 + RDS + S3):**  
  - **Pros:** Greater control over your environment, ability to use traditional relational databases like PostgreSQL, and flexibility to install custom software.  
  - **Cons:** Requires you to manage and maintain the servers, including scaling and security patches.

- **Option 3 (Serverless):**  
  - **Pros:** No need to worry about server management; automatic scaling and a pay-per-use pricing model can be very cost-effective, especially with variable traffic.  
  - **Cons:** You might need to rework your Flask app to fit the Lambda execution model, and switching from PostgreSQL to DynamoDB may require significant changes in how you handle data.

In **Option 1**, you would essentially be renting a virtual machine (an EC2 instance) from AWS and running your code on that machine, much like you do on your local computer. The main differences are:
- **Accessibility:** The EC2 instance is in the cloud, so it's accessible from anywhere.
- **Scalability:** You can upgrade or add more instances as your traffic grows.
- **Management:** You'll be responsible for managing the server (like installing updates, handling security, etc.), similar to managing your own computer.
This setup gives you more control over the environment compared to a serverless approach, but it also means you have to handle more of the infrastructure management yourself.

EC2 is like renting a virtual machine where you install and run your code, similar to how you run it on your local computer.
Think of S3 as a massive, cloud-based storage locker. It’s designed to store and serve files (like images, videos, static website assets, backups, etc.).
Unlike a traditional file system, S3 stores objects (files) in buckets and provides high durability, scalability, and availability.
It’s ideal for hosting static websites or serving files without having to manage a dedicated server.

RDS is a fully managed database service offered by AWS. It allows you to run relational databases (like PostgreSQL, MySQL, etc.) without managing the underlying server.
Unlike manually installing PostgreSQL on an EC2 instance, RDS handles backups, patching, scaling, and maintenance automatically.