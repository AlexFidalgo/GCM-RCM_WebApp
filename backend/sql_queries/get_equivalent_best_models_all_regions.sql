WITH gcm_data AS (
    SELECT gridpoint, gcm_model, region
    FROM equivalent_best_gcms
    WHERE physical_variable = %s AND metric_abbreviation = %s
),
rcm_data AS (
    SELECT gridpoint, rcm_model, region
    FROM equivalent_best_rcms
    WHERE physical_variable = %s AND metric_abbreviation = %s
)
SELECT 'gcm' AS model_type, gridpoint, gcm_model AS model_name, region FROM gcm_data
UNION ALL
SELECT 'rcm' AS model_type, gridpoint, rcm_model AS model_name, region FROM rcm_data;

