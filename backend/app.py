import logging
import os
import pandas as pd
import re
from flask import Flask, jsonify, request
from flask_cors import CORS

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = Flask(__name__)
CORS(app)  # Enable Cross-Origin Resource Sharing

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')

@app.before_request
def log_request_info():
    logging.info(f"Request: {request.method} {request.url}")

@app.route('/')
def home():
    return jsonify({'message': 'Flask API is running successfully!'})

# The /list_regions route returns a list of all available regions
@app.route('/list_regions', methods=['GET'])
def list_regions():
    try:
        regions = [d for d in os.listdir(DATA_DIR) if os.path.isdir(os.path.join(DATA_DIR, d))]
        return jsonify({'regions': regions})
    except Exception as e:
        logging.error(f"Error listing regions: {str(e)}")
        return jsonify({'error': 'Could not list regions'}), 500

# The /list_metrics route returns available error metrics based on the selected region and variable
@app.route('/list_metrics', methods=['GET'])
def list_metrics():
    region = request.args.get('region')
    physical_variable = request.args.get('physical_variable')
    
    if not region or not physical_variable:
        return jsonify({'error': 'Region and physical_variable parameters are required'}), 400
    
    region_path = os.path.join(DATA_DIR, region)
    if not os.path.exists(region_path):
        return jsonify({'error': 'Region not found'}), 404
    
    try:
        metric_pattern = re.compile(r"anova_effects_{}_{}_.*_(\w+)\.csv".format(re.escape(physical_variable), re.escape(region)))
        metrics = set()
        
        for file in os.listdir(region_path):
            match = metric_pattern.match(file)
            if match:
                metrics.add(match.group(1))
        
        if not metrics:
            return jsonify({'error': 'No metrics found'}), 404
        
        return jsonify({'metrics': sorted(metrics)})
    except Exception as e:
        logging.error(f"Error listing metrics for {region}, {physical_variable}: {str(e)}")
        return jsonify({'error': 'Could not list metrics'}), 500

# The /load_csv route now automatically finds the correct CSV file
@app.route('/load_csv', methods=['GET'])
def load_csv():
    region = request.args.get('region')
    physical_variable = request.args.get('physical_variable')
    metric_abbreviation = request.args.get('metric')
    
    if not region or not physical_variable or not metric_abbreviation:
        return jsonify({'error': 'Region, physical_variable, and metric parameters are required'}), 400
    
    region_path = os.path.join(DATA_DIR, region)
    if not os.path.exists(region_path):
        return jsonify({'error': 'Region not found'}), 404
    
    try:
        # Find the first matching file automatically
        matching_files = [
            f for f in os.listdir(region_path)
            if f.startswith(f"anova_effects_{physical_variable}_") and f.endswith(f"_{metric_abbreviation}.csv")
        ]
        
        if not matching_files:
            return jsonify({'error': 'No matching file found'}), 404
        
        file_path = os.path.join(region_path, matching_files[0])
        
        df = pd.read_csv(file_path)
        return jsonify(df.to_dict(orient='records'))
    except Exception as e:
        logging.error(f"Error loading CSV file in region {region}: {str(e)}")
        return jsonify({'error': 'Could not load CSV file'}), 500

# Error handling
@app.errorhandler(404)
def not_found(error):
    logging.warning("404 Not Found: " + request.url)
    return jsonify({'error': 'Not Found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logging.error("500 Internal Server Error: " + str(error))
    return jsonify({'error': 'Internal Server Error'}), 500

if __name__ == '__main__':
    app.run(debug=True)
