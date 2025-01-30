import { useState, useEffect } from "react";
import axios from "axios";

const RegionSelector = ({ onRegionSelect }) => {
    const [regions, setRegions] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState("");

    useEffect(() => {
        axios.get("http://127.0.0.1:5000/list_regions")
            .then(response => {
                setRegions(response.data.regions);
            })
            .catch(error => {
                console.error("Error fetching regions:", error);
            });
    }, []);

    const handleChange = (event) => {
        const region = event.target.value;
        setSelectedRegion(region);
        onRegionSelect(region);
    };

    return (
        <div>
            <label>Select a Region:</label>
            <select value={selectedRegion} onChange={handleChange}>
                <option value="">-- Choose a Region --</option>
                {regions.map(region => (
                    <option key={region} value={region}>{region}</option>
                ))}
            </select>
        </div>
    );
};

export default RegionSelector;
