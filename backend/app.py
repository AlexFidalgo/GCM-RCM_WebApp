import os
import psycopg2
from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS

# Load environment variables from .env file
load_dotenv()

# Database connection settings
DB_NAME = os.getenv("DB_NAME")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

# Flask app setup
app = Flask(__name__)
CORS(app)

# Function to get a database connection
def get_db_connection():
    return psycopg2.connect(
        dbname=DB_NAME, user=DB_USER, password=DB_PASSWORD, host=DB_HOST, port=DB_PORT
    )

# Function to read SQL queries from files
def read_sql_query(filename):
    sql_path = os.path.join(os.path.dirname(__file__), "sql_queries", filename)
    with open(sql_path, "r") as file:
        return file.read()

# 📌 **List Available Regions**
@app.route("/list_regions", methods=["GET"])
def list_regions():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = read_sql_query("list_regions.sql")
        cursor.execute(query)
        regions = [row[0] for row in cursor.fetchall()]
        conn.close()
        return jsonify({"regions": regions})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 📌 **List Available Metrics for a Variable (optionally filtered by Region)**
@app.route("/list_metrics", methods=["GET"])
def list_metrics():
    region = request.args.get("region")
    physical_variable = request.args.get("physical_variable")

    if not physical_variable:
        return jsonify({"error": "physical_variable parameter is required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if region:
            # Use region-specific query
            query = read_sql_query("list_metrics.sql")
            cursor.execute(query, (region, physical_variable))
        else:
            # Use all-regions query
            query = read_sql_query("list_metrics_all_regions.sql")
            cursor.execute(query, (physical_variable,))
        
        metrics = [row[0] for row in cursor.fetchall()]
        conn.close()
        return jsonify({"metrics": sorted(metrics)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 📌 **Load Data for Variable & Metric (optionally filtered by Region)**
@app.route("/load_csv", methods=["GET"])
def load_csv():
    region = request.args.get("region")
    physical_variable = request.args.get("physical_variable")
    metric_abbreviation = request.args.get("metric")

    if not physical_variable or not metric_abbreviation:
        return jsonify({"error": "physical_variable and metric parameters are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if region:
            # Use region-specific query
            query = read_sql_query("load_csv.sql")
            cursor.execute(query, (region, physical_variable, metric_abbreviation))
        else:
            # Use all-regions query
            query = read_sql_query("load_csv_all_regions.sql")
            cursor.execute(query, (physical_variable, metric_abbreviation))

        records = [
            {
                "Gridpoint": row[0],
                "GCM_effect": row[1],
                "RCM_effect": row[2],
                "Interaction_effect": row[3],
                "min_gcm": row[4],
                "min_rcm": row[5],
                "latitude": row[6],
                "longitude": row[7],
                "region": row[8]
            }
            for row in cursor.fetchall()
        ]

        conn.close()
        return jsonify(records)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/best_models", methods=["GET"])
def best_models():
    region = request.args.get("region")
    physical_variable = request.args.get("physical_variable")
    metric_abbreviation = request.args.get("metric")

    if not physical_variable or not metric_abbreviation:
        return jsonify({"error": "physical_variable and metric parameters are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if region:
            # Use region-specific query
            query = read_sql_query("best_models.sql")
            cursor.execute(query, (region, physical_variable, metric_abbreviation))
        else:
            # Use all-regions query
            query = read_sql_query("best_models_all_regions.sql")
            cursor.execute(query, (physical_variable, metric_abbreviation))

        records = [
            {
                "Gridpoint": row[0],
                "Best_GCM": row[1],
                "Best_RCM": row[2],
                "latitude": row[3],
                "longitude": row[4],
                "region": row[5]
            }
            for row in cursor.fetchall()
        ]

        conn.close()
        return jsonify(records)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 📌 **List Regions Available for a Metric & Variable**
@app.route("/list_regions_for_metric", methods=["GET"])
def list_regions_for_metric():
    physical_variable = request.args.get("physical_variable")
    metric_abbreviation = request.args.get("metric")

    if not physical_variable or not metric_abbreviation:
        return jsonify({"error": "physical_variable and metric parameters are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        query = read_sql_query("list_regions_for_metric.sql")
        cursor.execute(query, (physical_variable, metric_abbreviation))
        regions = [row[0] for row in cursor.fetchall()]
        conn.close()
        return jsonify({"regions": regions})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/")
def home():
    return jsonify({"message": "Flask API is running successfully!"})

@app.route("/equivalent_best_models", methods=["GET"])
def get_equivalent_best_models():
    region = request.args.get("region")
    variable = request.args.get("physical_variable")
    metric = request.args.get("metric")

    if not variable or not metric:
        return jsonify({"error": "physical_variable and metric parameters are required"}), 400

    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        if region:
            # Use region-specific query
            query = read_sql_query("get_equivalent_best_models.sql")
            cursor.execute(query, (region, variable, metric, region, variable, metric)) # Parameters must be passed twice: once for GCM query, once for RCM
        else:
            # Use all-regions query
            query = read_sql_query("get_equivalent_best_models_all_regions.sql")
            cursor.execute(query, (variable, metric, variable, metric)) # Parameters must be passed twice: once for GCM query, once for RCM
        
        rows = cursor.fetchall()
        conn.close()

        from collections import defaultdict
        # Use composite key: "region-gridpoint" to handle overlapping gridpoint IDs across regions
        gcm_dict = defaultdict(list)
        rcm_dict = defaultdict(list)

        for model_type, gridpoint, model_name, region_val in rows:
            # Create unique key combining region and gridpoint
            key = f"{region_val}-{gridpoint}"
            if model_type == "gcm":
                gcm_dict[key].append(model_name)
            else:
                rcm_dict[key].append(model_name)

        return jsonify({
            "equivalent_best_gcms": gcm_dict,
            "equivalent_best_rcms": rcm_dict
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500



# Run Flask app
if __name__ == "__main__":
    app.run(debug=True)
