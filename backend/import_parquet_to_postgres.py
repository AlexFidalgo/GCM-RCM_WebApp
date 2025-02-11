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

# Path to Parquet files (folder renamed to complete_data)
DATA_DIR = "backend/complete_data"

# Connect to PostgreSQL
conn = psycopg2.connect(
    dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT
)
cursor = conn.cursor()

# Function to process each Parquet file
def process_parquet(file_path, region, physical_variable, metric_abbreviation):
    print(f"Processing: {file_path}")
    
    # Read Parquet file
    df = pd.read_parquet(file_path)
    
    # Rename columns to match the database schema
    # Note: 'mat_vector' is renamed to 'error'
    df = df.rename(columns={
        "Gridpoint": "gridpoint",
        "Model": "Model",
        "Metric": "Metric",
        "mat_vector": "error",
        "GCM": "GCM",
        "RCM": "RCM",
        "latitude": "latitude",
        "longitude": "longitude"
    })
    
    # Add metadata columns extracted from the filename and folder structure
    df["region"] = region
    df["physical_variable"] = physical_variable
    df["metric_abbreviation"] = metric_abbreviation

    # Insert data into the PostgreSQL table named "error"
    # Table columns order: region, physical_variable, gridpoint, Model, GCM, RCM, Metric, metric_abbreviation, error, latitude, longitude
    for _, row in df.iterrows():
        cursor.execute("""
            INSERT INTO error (
                region, physical_variable, gridpoint, "Model", GCM, RCM, "Metric", metric_abbreviation, error, latitude, longitude
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            row["region"],
            row["physical_variable"],
            row["gridpoint"],
            row["Model"],
            row["GCM"],
            row["RCM"],
            row["Metric"],
            row["metric_abbreviation"],
            row["error"],
            row["latitude"],
            row["longitude"]
        ))

    conn.commit()

# Iterate through all regions and Parquet files in the complete_data directory
for region in os.listdir(DATA_DIR):
    region_path = os.path.join(DATA_DIR, region)
    if os.path.isdir(region_path):
        for file in os.listdir(region_path):
            if file.endswith(".parquet"):
                # Extract metadata from the filename (assuming the filename format includes underscores)
                parts = file.split("_")
                if len(parts) >= 6:
                    physical_variable = parts[2]
                    metric_abbreviation = parts[-1].replace(".parquet", "")
                    
                    # Process and insert Parquet data
                    process_parquet(os.path.join(region_path, file), region, physical_variable, metric_abbreviation)

# Close connection
cursor.close()
conn.close()

print("✅ All Parquet files imported successfully!")
