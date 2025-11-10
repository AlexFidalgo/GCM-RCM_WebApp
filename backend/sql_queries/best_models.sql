SELECT 
    gridpoint, 
    min_gcm, 
    min_rcm, 
    latitude, 
    longitude,
    region
FROM 
    climate_metrics
WHERE 
    region = %s AND 
    physical_variable = %s AND 
    metric_abbreviation = %s AND
    interaction_effect = 0;
