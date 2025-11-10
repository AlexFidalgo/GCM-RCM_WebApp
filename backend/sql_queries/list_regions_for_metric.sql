SELECT 
    DISTINCT region 
FROM 
    climate_metrics 
WHERE 
    physical_variable = %s AND 
    metric_abbreviation = %s
ORDER BY region;

