import { useState, useEffect } from "react";
import axios from "axios";

const RegionSelector = ({ onRegionSelect }) => {
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState("");
    const API_URL = import.meta.env.VITE_API_URL; // Use environment variable

    useEffect(() => {
        axios.get(`${API_URL}/list_regions`)
            .then(response => {
                setRegions(response.data.regions);
            })
            .catch(error => {
                console.error("Error fetching regions:", error);
                setRegions([]); // Set an empty array to avoid crashes
            });
    }, []);

    const handleChange = (event) => {
        const region = event.target.value;
        setSelectedRegion(region);
        onRegionSelect(region);
    };

    return (
        <div>
            <label htmlFor="region-select">Select a Region: </label>
            <select id="region-select" value={selectedRegion} onChange={handleChange}>
                <option value="">-- Choose a Region --</option>
                {regions.length > 0 ? (
                    regions.map(region => (
                        <option key={region} value={region}>{region}</option>
                    ))
                ) : (
                    <option value="" disabled>Loading regions...</option>
                )}
            </select>
        </div>
    );
};

export default RegionSelector;

