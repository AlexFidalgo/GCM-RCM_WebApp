SELECT 
    gridpoint, 
    gcm_effect, 
    rcm_effect, 
    interaction_effect, 
    min_gcm, 
    min_rcm, 
    latitude, 
    longitude,
    region
FROM 
    climate_metrics
WHERE 
    physical_variable = %s AND 
    metric_abbreviation = %s;

