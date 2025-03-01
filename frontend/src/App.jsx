import { useState, useEffect } from "react";
import RegionSelector from "./components/RegionSelector";
import axios from "axios";
import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function App() {
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

    const interactionLegend = [
        { label: "Interaction", color: "yellow" },
        { label: "Only GCM", color: "blue" },
        { label: "Only RCM", color: "red" },
        { label: "RCM and GCM", color: "purple" },
        { label: "None", color: "green" },
    ];

    useEffect(() => {
        if (selectedRegion && selectedVariable) {
            axios.get(`http://127.0.0.1:5000/list_metrics?region=${selectedRegion}&physical_variable=${selectedVariable}`)
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

    useEffect(() => {
        if (selectedRegion && selectedVariable && selectedMetric) {
            const encodedMetric = encodeURIComponent(selectedMetric);

            axios.get(`http://127.0.0.1:5000/load_csv?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${encodedMetric}`)
                .then(response => {
                    setFileData(response.data);
                    setMapKey(prevKey => prevKey + 1);
                })
                .catch(error => {
                    console.error("Error loading CSV file:", error);
                    setFileData(null);
                });

            axios.get(`http://127.0.0.1:5000/best_models?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${encodedMetric}`)
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
        } else {
            setFileData(null);
            setBestModelsData(null);
        }
    }, [selectedMetric]);

    return (
        <div style={{ display: "flex", height: "90vh", width: "100vw" }}>
            {/* Left Panel */}
            <div style={{ width: "20%", padding: "5px", backgroundColor: "#222", color: "white" }}>
                <RegionSelector onRegionSelect={setSelectedRegion} />

                {selectedRegion && (
                    <div>
                        <p>Selected Region: {selectedRegion}</p>
                        <label htmlFor="variable-select">Select Physical Variable:</label>
                        <select id="variable-select" value={selectedVariable} onChange={(e) => setSelectedVariable(e.target.value)}>
                            <option value="">-- Choose a Variable --</option>
                            <option value="ppt">Precipitation (ppt)</option>
                            <option value="tas">Temperature (tas)</option>
                        </select>

                        {selectedVariable && availableMetrics.length > 0 && (
                            <div>
                                <p>Selected Variable: {selectedVariable}</p>
                                <label htmlFor="metric-select">Select Error Metric:</label>
                                <select id="metric-select" value={selectedMetric} onChange={(e) => setSelectedMetric(decodeURIComponent(e.target.value))}>
                                    <option value="">-- Choose a Metric --</option>
                                    {availableMetrics.map(metric => (
                                        <option key={metric} value={encodeURIComponent(metric)}>{metric}</option>
                                    ))}
                                </select>

                                {selectedMetric && (
                                    <div>
                                        <p>Selected Metric: {selectedMetric}</p>
                                        <label htmlFor="visualization-mode">Select Visualization:</label>
                                        <select id="visualization-mode" value={visualizationMode} onChange={(e) => setVisualizationMode(e.target.value)}>
                                            <option value="interaction">Interaction Effects</option>
                                            <option value="best_gcm">Best GCM</option>
                                            <option value="best_rcm">Best RCM</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Map View */}
            <div style={{ width: "80%", padding: "1px 1px 1px 1px" }}>
            <MapContainer key={mapKey} center={[45, 5]} zoom={5} style={{ height: "85vh", width: "100%" }}>
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
                {visualizationMode === "best_gcm" && bestModelsData && bestModelsData.map((point, index) => (
                    <CircleMarker key={index} center={[point.latitude, point.longitude]} radius={4}
                        fillColor={gcmColorMap[point.Best_GCM] || "gray"} 
                        fillOpacity={1} stroke={false}>
                        <Tooltip>
                            Gridpoint: {point.Gridpoint}<br />
                            Best GCM: {point.Best_GCM}
                        </Tooltip>
                    </CircleMarker>
                ))}

                {/* Best RCM Models */}
                {visualizationMode === "best_rcm" && bestModelsData && bestModelsData.map((point, index) => (
                    <CircleMarker key={index} center={[point.latitude, point.longitude]} radius={4}
                        fillColor={rcmColorMap[point.Best_RCM] || "gray"} 
                        fillOpacity={1} stroke={false}>
                        <Tooltip>
                            Gridpoint: {point.Gridpoint}<br />
                            Best RCM: {point.Best_RCM}
                        </Tooltip>
                    </CircleMarker>
                ))}
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
                        <span style={{ color: "white" }}>{label}</span>
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
                        <span style={{ color: "white" }}>{model}</span>
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
                        <span style={{ color: "white" }}>{model}</span>
                    </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;
