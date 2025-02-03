SELECT 
    gridpoint, 
    gcm_effect, 
    rcm_effect, 
    interaction_effect, 
    min_gcm, 
    min_rcm, 
    latitude, 
    longitude
FROM 
    climate_metrics
WHERE 
    region = %s AND 
    physical_variable = %s AND 
    metric_abbreviation = %s;
