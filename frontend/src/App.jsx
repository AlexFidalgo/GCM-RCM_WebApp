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

    useEffect(() => {
        if (selectedRegion && selectedVariable) {
            axios.get(`http://127.0.0.1:5000/list_metrics?region=${selectedRegion}&physical_variable=${selectedVariable}`)
                .then(response => {
                    setAvailableMetrics(response.data.metrics);
                    setSelectedMetric(""); // Reset metric selection when region or variable changes
                })
                .catch(error => {
                    console.error("Error fetching metrics:", error);
                    setAvailableMetrics([]);
                });
        }
    }, [selectedRegion, selectedVariable]);

    useEffect(() => {
        if (selectedRegion && selectedVariable && selectedMetric) {
            axios.get(`http://127.0.0.1:5000/load_csv?region=${selectedRegion}&physical_variable=${selectedVariable}&metric=${selectedMetric}`)
                .then(response => {
                    setFileData(response.data);
                })
                .catch(error => {
                    console.error("Error loading CSV file:", error);
                });
        }
    }, [selectedRegion, selectedVariable, selectedMetric]);

    return (
        <div>
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
                            <select id="metric-select" value={selectedMetric} onChange={(e) => setSelectedMetric(e.target.value)}>
                                <option value="">-- Choose a Metric --</option>
                                {availableMetrics.map(metric => (
                                    <option key={metric} value={metric}>{metric}</option>
                                ))}
                            </select>
                            {fileData && (
                                <div>
                                    <h2>Map Visualization</h2>
                                    <MapContainer center={[45, 5]} zoom={5} style={{ height: "500px", width: "100%" }}>
                                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                        {fileData.map((point, index) => (
                                            <CircleMarker
                                                key={index}
                                                center={[point.latitude, point.longitude]}
                                                radius={5}
                                                color={point.Interaction_effect ? "yellow" : point.GCM_effect ? "blue" : point.RCM_effect ? "red" : "green"}
                                            >
                                                <Tooltip>
                                                    Gridpoint: {point.Gridpoint}<br />
                                                    GCM Effect: {point.GCM_effect}<br />
                                                    RCM Effect: {point.RCM_effect}<br />
                                                    Interaction Effect: {point.Interaction_effect}
                                                </Tooltip>
                                            </CircleMarker>
                                        ))}
                                    </MapContainer>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default App;
