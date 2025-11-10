App.jsx
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Rectangle } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const regionBounds = {
    BI: [[50, -10], [59, 2]],
    IP: [[36, -10], [44, 3]],
    FR: [[44, -5], [50, 5]],
    ME: [[48, 2], [55, 16]],
    SC: [[55, 5], [70, 30]],
    AL: [[44, 5], [48, 15]],
    MD: [[36, 3], [44, 25]],
    EA: [[44, 16], [55, 30]] 
};

function App() {
    const API_URL = import.meta.env.VITE_API_URL;

    const [selectedRegion, setSelectedRegion] = useState(""); // Optional filter - empty means all regions
    const [selectedVariable, setSelectedVariable] = useState("");
    const [availableMetrics, setAvailableMetrics] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState("");
    const [availableRegions, setAvailableRegions] = useState([]); // Regions available for selected metric
    const [fileData, setFileData] = useState(null);
    const [bestModelsData, setBestModelsData] = useState(null);
    const [mapKey, setMapKey] = useState(0);
    const [visualizationMode, setVisualizationMode] = useState("interaction");
    const [gcmColorMap, setGcmColorMap] = useState({});
    const [rcmColorMap, setRcmColorMap] = useState({});
    const [equivalentBestGCMs, setEquivalentBestGCMs] = useState({});
    const [equivalentBestRCMs, setEquivalentBestRCMs] = useState({});
    const [selectedGCMFilter, setSelectedGCMFilter] = useState("");
    const [selectedRCMFilter, setSelectedRCMFilter] = useState("");
    const [showRegionBoundaries, setShowRegionBoundaries] = useState(true);



    const interactionLegend = [
        { label: "Interaction", color: "yellow" },
        { label: "Only GCM", color: "blue" },
        { label: "Only RCM", color: "red" },
        { label: "RCM and GCM", color: "purple" },
        { label: "None", color: "green" },
    ];

    useEffect(() => {
        console.log("Selected metric changed:", selectedMetric);
        console.log("Map key:", mapKey);
    }, [selectedMetric, mapKey]);    

    // Fetch metrics when variable is selected (always show metrics across all regions)
    useEffect(() => {
        if (selectedVariable) {
            // Always fetch metrics across all regions for this variable (region filter doesn't affect available metrics)
            axios.get(`${API_URL}/list_metrics?physical_variable=${selectedVariable}`)
                .then(response => {
                    setAvailableMetrics(response.data.metrics);
                    setSelectedMetric("");
                    setFileData(null);
                    setBestModelsData(null);
                    setAvailableRegions([]);
                    setMapKey(prevKey => prevKey + 1);
                })
                .catch(error => {
                    console.error("Error fetching metrics:", error);
                    setAvailableMetrics([]);
                    setFileData(null);
                    setBestModelsData(null);
                    setAvailableRegions([]);
                });
        } else {
            setAvailableMetrics([]);
            setSelectedMetric("");
            setFileData(null);
            setBestModelsData(null);
            setAvailableRegions([]);
        }
    }, [selectedVariable]);


	const mapRef = useRef();

	// Update map bounds based on selected region or show all regions
	useEffect(() => {
	    if (mapRef.current && fileData && fileData.length > 0) {
	        const map = mapRef.current;
	        if (selectedRegion && regionBounds[selectedRegion]) {
	            // Fit to selected region
	            map.fitBounds(regionBounds[selectedRegion]);
	        } else {
	            // Fit to all data points (all regions)
	            let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
	            
	            fileData.forEach(point => {
	                if (point.latitude && point.longitude) {
	                    minLat = Math.min(minLat, point.latitude);
	                    maxLat = Math.max(maxLat, point.latitude);
	                    minLon = Math.min(minLon, point.longitude);
	                    maxLon = Math.max(maxLon, point.longitude);
	                }
	            });
	            
	            if (minLat !== 90 && maxLat !== -90) { // Only if we have valid bounds
	                map.fitBounds([[minLat, minLon], [maxLat, maxLon]]);
	            }
	        }
	    }
	}, [selectedRegion, fileData]);

    // Fetch regions available for the selected metric
    useEffect(() => {
        if (selectedVariable && selectedMetric) {
            const encodedMetric = encodeURIComponent(selectedMetric);
            axios.get(`${API_URL}/list_regions_for_metric?physical_variable=${selectedVariable}&metric=${encodedMetric}`)
                .then(response => {
                    setAvailableRegions(response.data.regions);
                })
                .catch(error => {
                    console.error("Error fetching regions for metric:", error);
                    setAvailableRegions([]);
                });
        } else {
            setAvailableRegions([]);
        }
    }, [selectedVariable, selectedMetric]);

    // Fetch data when metric is selected (region is optional filter)
    useEffect(() => {
        if (selectedVariable && selectedMetric) {
            setFileData(null);
            setBestModelsData(null);
            const encodedMetric = encodeURIComponent(selectedMetric);

            // Build URL with optional region parameter
            const loadCsvUrl = selectedRegion
                ? `${API_URL}/load_csv?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${encodedMetric}`
                : `${API_URL}/load_csv?physical_variable=${selectedVariable}&metric=${encodedMetric}`;

            axios.get(loadCsvUrl)
                .then(response => {
                    console.log("New fileData", response.data);
                    setFileData(response.data);
                    setMapKey(prevKey => prevKey + 1);
                })
                .catch(error => {
                    console.error("Error loading CSV file:", error);
                    setFileData(null);
                });

            const bestModelsUrl = selectedRegion
                ? `${API_URL}/best_models?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${encodedMetric}`
                : `${API_URL}/best_models?physical_variable=${selectedVariable}&metric=${encodedMetric}`;

            axios.get(bestModelsUrl)
                .then(response => {
                    setBestModelsData(response.data);

                    // Generate distinct colors for GCM and RCM models separately
                    const uniqueGCMs = [...new Set(response.data.map(item => item.Best_GCM).filter(Boolean))];
                    const uniqueRCMs = [...new Set(response.data.map(item => item.Best_RCM).filter(Boolean))];

                    const gcmColors = uniqueGCMs.reduce((acc, model, index) => {
                        acc[model] = `hsl(${(index * 137) % 360}, 70%, 50%)`; // Unique colors for GCMs
                        return acc;
                    }, {});

                    const rcmColors = uniqueRCMs.reduce((acc, model, index) => {
                        acc[model] = `hsl(${(index * 137) % 360}, 70%, 50%)`; // Unique colors for RCMs
                        return acc;
                    }, {});

                    setGcmColorMap(gcmColors);
                    setRcmColorMap(rcmColors);
                })
                .catch(error => {
                    console.error("Error fetching best models:", error);
                    setBestModelsData(null);
                });

            const equivalentModelsUrl = selectedRegion
                ? `${API_URL}/equivalent_best_models?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${encodedMetric}`
                : `${API_URL}/equivalent_best_models?physical_variable=${selectedVariable}&metric=${encodedMetric}`;

            axios.get(equivalentModelsUrl)
                .then(response => {
                    setEquivalentBestGCMs(response.data.equivalent_best_gcms);
                    setEquivalentBestRCMs(response.data.equivalent_best_rcms);
                })
                .catch(error => {
                    console.error("Error fetching equivalent best models:", error);
                    setEquivalentBestGCMs({});
                    setEquivalentBestRCMs({});
                });

        } else {
            setFileData(null);
            setBestModelsData(null);
        }
    }, [selectedVariable, selectedMetric, selectedRegion]);

    return (
        <div style={{ display: "flex", height: "90vh", width: "100vw" }}>
            {/* Left Panel */}
            <div style={{ width: "20%", padding: "5px", backgroundColor: "#222", color: "white"}}>
                {/* Toggle Region Boundaries Button */}
                <div style={{ marginBottom: "15px" }}>
                    <button
                        onClick={() => setShowRegionBoundaries(!showRegionBoundaries)}
                        style={{
                            padding: "8px 16px",
                            backgroundColor: showRegionBoundaries ? "#4CAF50" : "#666",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "14px",
                            fontWeight: "bold",
                            width: "100%"
                        }}
                        onMouseOver={(e) => e.target.style.opacity = "0.8"}
                        onMouseOut={(e) => e.target.style.opacity = "1"}
                    >
                        {showRegionBoundaries ? "✓ Hide Boundaries" : "Show Boundaries"}
                    </button>
                </div>
                
                {/* Physical Variable Selector - First Step */}
                <div style={{ marginBottom: "15px" }}>
                    <label htmlFor="variable-select">Select Physical Variable: </label>
                    <select id="variable-select" value={selectedVariable} onChange={(e) => setSelectedVariable(e.target.value)}>
                        <option value="">-- Choose a Variable --</option>
                        <option value="ppt">Precipitation (ppt)</option>
                        <option value="tas">Temperature (tas)</option>
                    </select>
                </div>

                {/* Metric Selector - Second Step */}
                {selectedVariable && availableMetrics.length > 0 && (
                    <div style={{ marginBottom: "15px" }}>
                        <p>Selected Variable: {selectedVariable}</p>
                        <label htmlFor="metric-select">Select Error Metric: </label>
                        <select
                            id="metric-select"
                            value={selectedMetric}
                            onChange={(e) => {
                                const metric = e.target.value;
                                setSelectedMetric(metric);
                                setMapKey((prev) => prev + 1); // Force map refresh
                            }}
                        >
                            <option value="">-- Choose a Metric --</option>
                            {availableMetrics.map(metric => (
                                <option key={metric} value={metric}>{metric}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Region Selector - Optional Filter (shown after metric is selected) */}
                {selectedMetric && availableRegions.length > 0 && (
                    <div style={{ marginBottom: "15px" }}>
                        <p>Selected Metric: {selectedMetric}</p>
                        <label htmlFor="region-select">Filter by Region (optional): </label>
                        <select 
                            id="region-select" 
                            value={selectedRegion} 
                            onChange={(e) => setSelectedRegion(e.target.value)}
                        >
                            <option value="">-- All Regions --</option>
                            {availableRegions.map(region => (
                                <option key={region} value={region}>{region}</option>
                            ))}
                        </select>
                        {selectedRegion && <p style={{ marginTop: "5px", fontSize: "12px" }}>Filtering: {selectedRegion}</p>}
                        {!selectedRegion && <p style={{ marginTop: "5px", fontSize: "12px", color: "#aaa" }}>Showing all {availableRegions.length} regions</p>}
                    </div>
                )}

                {/* Visualization Options - Shown after metric is selected */}
                {selectedMetric && (
                    <div style={{ marginBottom: "15px" }}>
                        <label htmlFor="visualization-mode">Select Visualization: </label>
                        <select id="visualization-mode" value={visualizationMode} onChange={(e) => setVisualizationMode(e.target.value)}>
                            <option value="interaction">Interaction Effects</option>
                            <option value="best_gcm">Best GCM</option>
                            <option value="best_rcm">Best RCM</option>
                            <option value="gcm_filter">GCM Filter</option>
                            <option value="rcm_filter">RCM Filter</option>
                        </select>

                        {/* GCM Filter dropdown */}
                        {visualizationMode === "gcm_filter" && (
                            <div style={{ marginTop: "10px" }}>
                                <label htmlFor="gcm-filter-select">Select GCM Model: </label>
                                <select
                                    id="gcm-filter-select"
                                    value={selectedGCMFilter}
                                    onChange={(e) => setSelectedGCMFilter(e.target.value)}
                                >
                                    <option value="">-- Choose a GCM --</option>
                                    {[...new Set(Object.values(equivalentBestGCMs).flat())].map(gcm => (
                                        <option key={gcm} value={gcm}>{gcm}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* RCM Filter dropdown */}
                        {visualizationMode === "rcm_filter" && (
                            <div style={{ marginTop: "10px" }}>
                                <label htmlFor="rcm-filter-select">Select RCM Model: </label>
                                <select
                                    id="rcm-filter-select"
                                    value={selectedRCMFilter}
                                    onChange={(e) => setSelectedRCMFilter(e.target.value)}
                                >
                                    <option value="">-- Choose a RCM --</option>
                                    {[...new Set(Object.values(equivalentBestRCMs).flat())].map(rcm => (
                                        <option key={rcm} value={rcm}>{rcm}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Map View */}
            <div style={{ width: "80%", padding: "1px 1px 1px 1px" }}>
	    <MapContainer ref={mapRef} center={[45, 5]} zoom={5} style={{ height: "85vh", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {showRegionBoundaries && Object.entries(regionBounds).map(([regionKey, bounds], index) => (
                        <Rectangle
                            key={index}
                            bounds={bounds}
                            pathOptions={{
                                color: "gray",
                                weight: 2,
                                fill: false 
                            }}
                        />
                    ))}

                {/* Interaction Effects */}
                {visualizationMode === "interaction" && fileData && fileData.map((point, index) => (
                    <CircleMarker key={`${point.region || 'unknown'}-${point.Gridpoint}-${index}`} center={[point.latitude, point.longitude]} radius={4}
                        fillColor={point.Interaction_effect ? "yellow" : point.GCM_effect && point.RCM_effect ? "purple" : point.GCM_effect ? "blue" : point.RCM_effect ? "red" : "green"}
                        fillOpacity={1} stroke={false}>
                        <Tooltip>
                            <div>
                                <strong>Region:</strong> {point.region || "N/A"}<br />
                                <strong>Gridpoint:</strong> {point.Gridpoint}<br />
                                <strong>GCM Effect:</strong> {point.GCM_effect}<br />
                                <strong>RCM Effect:</strong> {point.RCM_effect}<br />
                                <strong>Interaction Effect:</strong> {point.Interaction_effect}
                            </div>
                        </Tooltip>
                    </CircleMarker>
                ))}

                {/* Best GCM Models */}
                {visualizationMode === "best_gcm" && bestModelsData && bestModelsData.map((point, index) => {
                    // Use region-gridpoint composite key to handle overlapping gridpoint IDs
                    const key = point.region ? `${point.region}-${point.Gridpoint}` : point.Gridpoint?.toString();
                    const equivalents = equivalentBestGCMs[key] || [];

                    return (
                        <CircleMarker key={`gcm-${point.region || 'unknown'}-${point.Gridpoint}-${index}`} center={[point.latitude, point.longitude]} radius={4}
                            fillColor={gcmColorMap[point.Best_GCM] || "gray"}
                            fillOpacity={1} stroke={false}>
                            <Tooltip>
                                <div>
                                    <strong>Region:</strong> {point.region || "N/A"}<br />
                                    <strong>Gridpoint:</strong> {point.Gridpoint}<br />
                                    <strong>Best GCM:</strong> {point.Best_GCM}<br />
                                    <strong>Equivalent Best GCMs:</strong>
                                    <ul style={{ margin: 0, paddingLeft: "1em" }}>
                                        {equivalents.map((gcm, i) => (
                                            <li key={i}>{gcm}</li>
                                        ))}
                                    </ul>
                                </div>
                            </Tooltip>
                        </CircleMarker>
                    );
                })}


                {/* Best RCM Models */}
                {visualizationMode === "best_rcm" && bestModelsData && bestModelsData.map((point, index) => {
                    // Use region-gridpoint composite key to handle overlapping gridpoint IDs
                    const key = point.region ? `${point.region}-${point.Gridpoint}` : point.Gridpoint?.toString();
                    const equivalents = equivalentBestRCMs[key] || [];

                    return (
                        <CircleMarker key={`rcm-${point.region || 'unknown'}-${point.Gridpoint}-${index}`} center={[point.latitude, point.longitude]} radius={4}
                            fillColor={rcmColorMap[point.Best_RCM] || "gray"}
                            fillOpacity={1} stroke={false}>
                            <Tooltip>
                                <div>
                                    <strong>Region:</strong> {point.region || "N/A"}<br />
                                    <strong>Gridpoint:</strong> {point.Gridpoint}<br />
                                    <strong>Best RCM:</strong> {point.Best_RCM}<br />
                                    <strong>Equivalent Best RCMs:</strong>
                                    <ul style={{ margin: 0, paddingLeft: "1em" }}>
                                        {equivalents.map((rcm, i) => (
                                            <li key={i}>{rcm}</li>
                                        ))}
                                    </ul>
                                </div>
                            </Tooltip>
                        </CircleMarker>
                    );
                })}


                {/* GCM Filter */}
                {visualizationMode === "gcm_filter" && selectedGCMFilter && bestModelsData && bestModelsData.map((point, index) => {
                    // Use region-gridpoint composite key to handle overlapping gridpoint IDs
                    const key = point.region ? `${point.region}-${point.Gridpoint}` : point.Gridpoint?.toString();
                    const equivalents = equivalentBestGCMs[key] || [];
                    const isMatch = equivalents.includes(selectedGCMFilter);

                    return isMatch ? (
                        <CircleMarker
                            key={`gcm-filter-${point.region || 'unknown'}-${point.Gridpoint}-${index}`}
                            center={[point.latitude, point.longitude]}
                            radius={5}
                            fillColor={"orange"}
                            fillOpacity={1}
                            stroke={false}
                        >
                            <Tooltip>
                                <div>
                                    <strong>Region:</strong> {point.region || "N/A"}<br />
                                    <strong>Gridpoint:</strong> {point.Gridpoint}<br />
                                    This GCM is among the statistically best.
                                </div>
                            </Tooltip>
                        </CircleMarker>
                    ) : null;
                })}

            {/* RCM Filter */}
            {visualizationMode === "rcm_filter" && selectedRCMFilter && bestModelsData && bestModelsData.map((point, index) => {
                // Use region-gridpoint composite key to handle overlapping gridpoint IDs
                const key = point.region ? `${point.region}-${point.Gridpoint}` : point.Gridpoint?.toString();
                const equivalents = equivalentBestRCMs[key] || [];
                const isMatch = equivalents.includes(selectedRCMFilter);

                return isMatch ? (
                    <CircleMarker
                        key={`rcm-filter-${point.region || 'unknown'}-${point.Gridpoint}-${index}`}
                        center={[point.latitude, point.longitude]}
                        radius={5}
                        fillColor={"orange"}
                        fillOpacity={1}
                        stroke={false}
                    >
                        <Tooltip>
                            <div>
                                <strong>Region:</strong> {point.region || "N/A"}<br />
                                <strong>Gridpoint:</strong> {point.Gridpoint}<br />
                                This RCM is among the statistically best.
                            </div>
                        </Tooltip>
                    </CircleMarker>
                ) : null;
            })}


            </MapContainer>

                {/* Legends */}
                <div style={{ display: "flex", justifyContent: "center", marginTop: "10px", flexWrap: "wrap", gap: "20px" }}>
                {visualizationMode === "interaction" &&
                    interactionLegend.map(({ label, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <div style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: color,
                        border: "1px solid #fff"
                        }} />
			<span style={{
			    color: "white",
			    WebkitTextStroke: "0.5px orange",  // This gives the orange contour
			    fontWeight: "bold"
			}}>
			    {label}
			</span>
                    </div>
                    ))}

                {visualizationMode === "best_gcm" &&
                    Object.entries(gcmColorMap).map(([model, color]) => (
                    <div key={model} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <div style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: color,
                        border: "1px solid #fff"
                        }} />
                        <span style={{
			    color: "white",
			    WebkitTextStroke: "0.5px orange",  // This gives the orange contour
			    fontWeight: "bold"
			}}>
			    {model}
			</span>

                    </div>
                    ))}

                {visualizationMode === "best_rcm" &&
                    Object.entries(rcmColorMap).map(([model, color]) => (
                    <div key={model} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                        <div style={{
                        width: "20px",
                        height: "20px",
                        backgroundColor: color,
                        border: "1px solid #fff"
                        }} />
		                        
			<span style={{
			    color: "white",
			    WebkitTextStroke: "0.5px orange",  // This gives the orange contour
			    fontWeight: "bold"
			}}>
			    {model}
			</span>
                    </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;
