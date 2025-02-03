import os
import psycopg2
import pandas as pd
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database connection settings from .env
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

# Path to CSV files
DATA_DIR = "backend/data"

# Connect to PostgreSQL
conn = psycopg2.connect(
    dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT
)
cursor = conn.cursor()

# Function to process each CSV file
def process_csv(file_path, region, physical_variable, metric_abbreviation):
    print(f"Processing: {file_path}")
    
    # Read CSV
    df = pd.read_csv(file_path)
    
    # Rename columns to match database schema
    df = df.rename(columns={
        "Gridpoint": "gridpoint",
        "GCM_effect": "gcm_effect",
        "RCM_effect": "rcm_effect",
        "Interaction_effect": "interaction_effect",
        "min_gcm": "min_gcm",
        "min_rcm": "min_rcm",
        "latitude": "latitude",
        "longitude": "longitude"
    })
    
    # Add metadata columns
    df["region"] = region
    df["physical_variable"] = physical_variable
    df["metric_abbreviation"] = metric_abbreviation

    # Insert data into PostgreSQL
    for _, row in df.iterrows():
        cursor.execute("""
            INSERT INTO climate_metrics (
                gridpoint, gcm_effect, rcm_effect, interaction_effect, 
                min_gcm, min_rcm, latitude, longitude, 
                region, physical_variable, metric_abbreviation
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            row["gridpoint"], row["gcm_effect"], row["rcm_effect"], row["interaction_effect"],
            row["min_gcm"], row["min_rcm"], row["latitude"], row["longitude"],
            row["region"], row["physical_variable"], row["metric_abbreviation"]
        ))

    conn.commit()

# Iterate through all regions and CSV files
for region in os.listdir(DATA_DIR):
    region_path = os.path.join(DATA_DIR, region)
    if os.path.isdir(region_path):
        for file in os.listdir(region_path):
            if file.endswith(".csv"):
                # Extract metadata from filename
                parts = file.split("_")
                if len(parts) >= 6:
                    physical_variable = parts[2]
                    metric_abbreviation = parts[-1].replace(".csv", "")
                    
                    # Process and insert CSV data
                    process_csv(os.path.join(region_path, file), region, physical_variable, metric_abbreviation)

# Close connection
cursor.close()
conn.close()

print("✅ All CSV files imported successfully!")
