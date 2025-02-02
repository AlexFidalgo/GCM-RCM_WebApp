import { useState, useEffect } from "react";
import RegionSelector from "./components/RegionSelector";
import axios from "axios";
import { MapContainer, TileLayer, CircleMarker, Tooltip, LayerGroup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function App() {
    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedVariable, setSelectedVariable] = useState("");
    const [availableMetrics, setAvailableMetrics] = useState([]);
    const [selectedMetric, setSelectedMetric] = useState("");
    const [fileData, setFileData] = useState(null);
    const [mapKey, setMapKey] = useState(0); // Unique key to force re-render

    useEffect(() => {
        if (selectedRegion && selectedVariable) {
            axios.get(`http://127.0.0.1:5000/list_metrics?region=${selectedRegion}&physical_variable=${selectedVariable}`)
                .then(response => {
                    setAvailableMetrics(response.data.metrics);
                    setSelectedMetric(""); // Reset metric selection when region or variable changes
                    setFileData(null); // Clear map data when changing region or variable
                    setMapKey(prevKey => prevKey + 1); // Force re-render
                })
                .catch(error => {
                    console.error("Error fetching metrics:", error);
                    setAvailableMetrics([]);
                    setFileData(null);
                });
        }
    }, [selectedRegion, selectedVariable]);

    useEffect(() => {
        if (selectedRegion && selectedVariable && selectedMetric) {
            const encodedMetric = encodeURIComponent(selectedMetric); // Encode spaces
            axios.get(`http://127.0.0.1:5000/load_csv?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${encodedMetric}`)
                .then(response => {
                    console.log("New data received for metric:", selectedMetric, response.data);
                    setFileData(response.data);
                    setMapKey(prevKey => prevKey + 1); // Force re-render on data update
                })
                .catch(error => {
                    console.error("Error loading CSV file:", error);
                    setFileData(null); // Clear map if data fetch fails
                });
        } else {
            setFileData(null); // Clear map when metric changes to empty
        }
    }, [selectedMetric]);

    // Define category colors matching the Python plot
    const categoryColors = {
        "Interaction": "yellow",
        "Only GCM": "blue",
        "Only RCM": "red",
        "RCM and GCM": "purple",
        "None": "green"
    };

    const categorizeData = (point) => {
        if (point.Interaction_effect) return "Interaction";
        if (point.GCM_effect && !point.RCM_effect) return "Only GCM";
        if (!point.GCM_effect && point.RCM_effect) return "Only RCM";
        if (point.GCM_effect && point.RCM_effect) return "RCM and GCM";
        return "None";
    };

    return (
        <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: "20px", width: "100vw" }}>
            <div style={{ width: "25%" }}>
                <h1>Climate Data Viewer</h1>
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
                                {selectedMetric && <p>Selected Metric: {selectedMetric}</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
            <div style={{ flexGrow: 1 }}>
                {fileData && (
                    <div>
                        <h2>Map Visualization</h2>
                        <MapContainer key={mapKey} center={[45, 5]} zoom={5} style={{ height: "80vh", width: "100%" }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <LayerGroup>
                                {fileData.map((point, index) => (
                                    <CircleMarker
                                        key={index}
                                        center={[point.latitude, point.longitude]}
                                        radius={6}
                                        fillColor={categoryColors[categorizeData(point)]}
                                        color="black"
                                        fillOpacity={0.8}
                                        weight={1}
                                    >
                                        <Tooltip>
                                            Gridpoint: {point.Gridpoint}<br />
                                            GCM Effect: {point.GCM_effect}<br />
                                            RCM Effect: {point.RCM_effect}<br />
                                            Interaction Effect: {point.Interaction_effect}
                                        </Tooltip>
                                    </CircleMarker>
                                ))}
                            </LayerGroup>
                        </MapContainer>
                        <div style={{ marginTop: "10px", display: "flex", justifyContent: "center", gap: "15px" }}>
                            {Object.entries(categoryColors).map(([category, color]) => (
                                <div key={category} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                                    <div style={{ width: "15px", height: "15px", backgroundColor: color, border: "1px solid black" }}></div>
                                    <span>{category}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
