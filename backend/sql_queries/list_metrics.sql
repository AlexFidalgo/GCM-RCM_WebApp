SELECT 
    DISTINCT metric_abbreviation 
FROM 
    climate_metrics 
WHERE 
    region = %s AND 
    physical_variable = %s;
