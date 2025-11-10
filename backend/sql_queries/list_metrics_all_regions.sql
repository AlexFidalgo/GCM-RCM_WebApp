SELECT 
    DISTINCT metric_abbreviation 
FROM 
    climate_metrics 
WHERE 
    physical_variable = %s;

