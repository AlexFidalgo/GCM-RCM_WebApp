WITH gcm_data AS (
    SELECT gridpoint, gcm_model
    FROM equivalent_best_gcms
    WHERE region = %s AND physical_variable = %s AND metric_abbreviation = %s
),
rcm_data AS (
    SELECT gridpoint, rcm_model
    FROM equivalent_best_rcms
    WHERE region = %s AND physical_variable = %s AND metric_abbreviation = %s
)
SELECT 'gcm' AS model_type, gridpoint, gcm_model AS model_name FROM gcm_data
UNION ALL
SELECT 'rcm' AS model_type, gridpoint, rcm_model AS model_name FROM rcm_data;
