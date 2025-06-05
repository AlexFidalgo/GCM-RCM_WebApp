App.jsx
import { useState, useEffect, useRef } from "react";
import RegionSelector from "./components/RegionSelector";
import axios from "axios";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
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

    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedVariable, setSelectedVariable] = useState("");
    const [availableMetrics, setAvailableMetrics] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState("");
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

    useEffect(() => {
        if (selectedRegion && selectedVariable) {
            axios.get(`${API_URL}/list_metrics?region=${selectedRegion}&physical_variable=${selectedVariable}`)
                .then(response => {
                    setAvailableMetrics(response.data.metrics);
                    setSelectedMetric("");
                    setFileData(null);
                    setBestModelsData(null);
                    setMapKey(prevKey => prevKey + 1);
                })
                .catch(error => {
                    console.error("Error fetching metrics:", error);
                    setAvailableMetrics([]);
                    setFileData(null);
                    setBestModelsData(null);
                });
        }
    }, [selectedRegion, selectedVariable]);


	const mapRef = useRef();

	useEffect(() => {
	    if (selectedRegion && regionBounds[selectedRegion] && mapRef.current) {
	        const map = mapRef.current;
	        map.fitBounds(regionBounds[selectedRegion]);
	    }
	}, [selectedRegion]);

    useEffect(() => {
        if (selectedRegion && selectedVariable && selectedMetric) {

            setFileData(null);
            setBestModelsData(null);
            const encodedMetric = encodeURIComponent(selectedMetric);

            axios.get(`${API_URL}/load_csv?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${encodedMetric}`)
                .then(response => {
                    console.log("New fileData", response.data);
                    setFileData(response.data);
                    setMapKey(prevKey => prevKey + 1);
                })
                .catch(error => {
                    console.error("Error loading CSV file:", error);
                    setFileData(null);
                });

            axios.get(`${API_URL}/best_models?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${encodedMetric}`)
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

            axios.get(`${API_URL}/equivalent_best_models?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${encodedMetric}`)
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
    }, [selectedMetric]);

    return (
        <div style={{ display: "flex", height: "90vh", width: "100vw" }}>
            {/* Left Panel */}
            <div style={{ width: "20%", padding: "5px", backgroundColor: "#222", color: "white"}}>
                <RegionSelector onRegionSelect={setSelectedRegion} />

                {selectedRegion && (
                    <div>
                        <p>Selected Region: {selectedRegion}</p>
                        
                        <div style={{ marginBottom: "10px" }}>
                            <label htmlFor="variable-select">Select Physical Variable: </label>
                            <select id="variable-select" value={selectedVariable} onChange={(e) => setSelectedVariable(e.target.value)}>
                                <option value="">-- Choose a Variable --</option>
                                <option value="ppt">Precipitation (ppt)</option>
                                <option value="tas">Temperature (tas)</option>
                            </select>
                        </div>
                        {selectedVariable && availableMetrics.length > 0 && (
                            <div>
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


                                {selectedMetric && (
                                    <div>
                                        <p>Selected Metric: {selectedMetric}</p>
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
                                                    {Object.keys(gcmColorMap).map(gcm => (
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
                                                    {Object.keys(rcmColorMap).map(rcm => (
                                                        <option key={rcm} value={rcm}>{rcm}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}


                                    </div>
                                )}


                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Map View */}
            <div style={{ width: "80%", padding: "1px 1px 1px 1px" }}>
	    <MapContainer ref={mapRef} center={[45, 5]} zoom={5} style={{ height: "85vh", width: "100%" }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

                {/* Interaction Effects */}
                {visualizationMode === "interaction" && fileData && fileData.map((point, index) => (
                    <CircleMarker key={index} center={[point.latitude, point.longitude]} radius={4}
                        fillColor={point.Interaction_effect ? "yellow" : point.GCM_effect && point.RCM_effect ? "purple" : point.GCM_effect ? "blue" : point.RCM_effect ? "red" : "green"}
                        fillOpacity={1} stroke={false}>
                        <Tooltip>
                            Gridpoint: {point.Gridpoint}<br />
                            GCM Effect: {point.GCM_effect}<br />
                            RCM Effect: {point.RCM_effect}<br />
                            Interaction Effect: {point.Interaction_effect}
                        </Tooltip>
                    </CircleMarker>
                ))}

                {/* Best GCM Models */}
                {visualizationMode === "best_gcm" && bestModelsData && bestModelsData.map((point, index) => {
                    const equivalents = equivalentBestGCMs[point.Gridpoint?.toString()] || [];

                    return (
                        <CircleMarker key={index} center={[point.latitude, point.longitude]} radius={4}
                            fillColor={gcmColorMap[point.Best_GCM] || "gray"}
                            fillOpacity={1} stroke={false}>
                            <Tooltip>
                                <div>
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
                    const equivalents = equivalentBestRCMs[point.Gridpoint?.toString()] || [];

                    return (
                        <CircleMarker key={index} center={[point.latitude, point.longitude]} radius={4}
                            fillColor={rcmColorMap[point.Best_RCM] || "gray"}
                            fillOpacity={1} stroke={false}>
                            <Tooltip>
                                <div>
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
                    const equivalents = equivalentBestGCMs[point.Gridpoint?.toString()] || [];
                    const isMatch = equivalents.includes(selectedGCMFilter);

                    return isMatch ? (
                        <CircleMarker
                            key={index}
                            center={[point.latitude, point.longitude]}
                            radius={5}
                            fillColor={"orange"}
                            fillOpacity={1}
                            stroke={false}
                        >
                            <Tooltip>
                                Gridpoint: {point.Gridpoint}<br />
                                This GCM is among the statistically best.
                            </Tooltip>
                        </CircleMarker>
                    ) : null;
                })}

            {/* RCM Filter */}
            {visualizationMode === "rcm_filter" && selectedRCMFilter && bestModelsData && bestModelsData.map((point, index) => {
                const equivalents = equivalentBestRCMs[point.Gridpoint?.toString()] || [];
                const isMatch = equivalents.includes(selectedRCMFilter);

                return isMatch ? (
                    <CircleMarker
                        key={index}
                        center={[point.latitude, point.longitude]}
                        radius={5}
                        fillColor={"orange"}
                        fillOpacity={1}
                        stroke={false}
                    >
                        <Tooltip>
                            Gridpoint: {point.Gridpoint}<br />
                            This RCM is among the statistically best.
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
