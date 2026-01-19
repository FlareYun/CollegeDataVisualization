import React, { useState, useMemo } from 'react';
import { Search, MapPin, TrendingUp, Users, Award, ChevronUp, ChevronDown, Filter } from 'lucide-react';
import TileMap, { getCategoryKey } from './components/TileMap';
import MetricCard from './components/MetricCard';
import { SimpleBarChart, DotPlot } from './components/Charts';

import sycamoreData from './data/sycamore.json';
import neuquaValleyData from './data/neuquaValleyData.json';

const SCHOOLS = {
    SYCAMORE: {
        id: 'SYCAMORE',
        name: 'Sycamore High School',
        data: sycamoreData
    },
    NEUQUA: {
        id: 'NEUQUA',
        name: 'Neuqua Valley High School',
        data: neuquaValleyData
    }
};

const processData = (rawData) => {
    const seenIds = new Map();
    return rawData.map(item => {
        let uniqueId = item.id;
        if (seenIds.has(uniqueId)) {
            const count = seenIds.get(uniqueId);
            uniqueId = `${item.id}-${count}`;
            seenIds.set(item.id, count + 1);
        } else {
            seenIds.set(uniqueId, 1);
        }
        return {
            ...item,
            id: uniqueId,
            attending: Number(item.attending) || 0,
            accepted: Number(item.accepted) || 0,
            rate: item.rate !== undefined ? Number(item.rate) : null,
            lat: Number(item.lat),
            lng: Number(item.lng)
        };
    });
};

const App = () => {
    const [selectedSchoolId, setSelectedSchoolId] = useState('SYCAMORE');

    // Process data when school changes
    const colleges = useMemo(() => {
        return processData(SCHOOLS[selectedSchoolId].data);
    }, [selectedSchoolId]);

    const [searchTerm, setSearchTerm] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: 'attending', direction: 'desc' });
    const [selectedCollegeId, setSelectedCollegeId] = useState(null);
    const [vizMode, setVizMode] = useState('attending');
    const [filters, setFilters] = useState({ HIGH: true, MED: true, LOW: true, VERY_LOW: true, MIN: true, EXTREME: true, VERY_LOW_ACC: true, LOW_ACC: true, SELECTIVE: true, MODERATE: true, OPEN: true, UNKNOWN: true });

    const toggleFilter = (key) => setFilters(prev => ({ ...prev, [key]: !prev[key] }));

    const stats = useMemo(() => {
        const totalAttending = colleges.reduce((sum, c) => sum + c.attending, 0);
        const totalAccepted = colleges.reduce((sum, c) => sum + c.accepted, 0);
        const rateColleges = colleges.filter(c => c.rate !== null && c.rate !== undefined);
        const avgAcceptanceRate = rateColleges.length ? Math.round(rateColleges.reduce((sum, c) => sum + c.rate, 0) / rateColleges.length) : 0;
        const mostPopular = colleges.length ? colleges.reduce((prev, current) => (prev.attending > current.attending) ? prev : current) : null;
        return { totalAttending, totalAccepted, avgAcceptanceRate, mostPopular };
    }, [colleges]);

    // Chart Data Preparation
    const chartData = useMemo(() => {
        // 1. Top Attending
        const topAttending = [...colleges]
            .sort((a, b) => b.attending - a.attending)
            .slice(0, 8)
            .map(c => ({ label: c.name, value: c.attending }));

        return { topAttending, rateDist: colleges }; // Pass raw colleges for DotPlot
    }, [colleges]);

    const filteredColleges = useMemo(() => {
        let data = [...colleges];
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(c => c.name.toLowerCase().includes(lower) || c.city.toLowerCase().includes(lower) || c.state.toLowerCase().includes(lower));
        }
        data = data.filter(c => {
            const category = getCategoryKey(c, vizMode);
            return filters[category] !== false;
        });
        data.sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (valA === null || valA === undefined) valA = -1;
            if (valB === null || valB === undefined) valB = -1;
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [colleges, searchTerm, sortConfig, vizMode, filters]);

    const handleSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') direction = 'asc';
        setSortConfig({ key, direction });
    };

    const handleMapSelect = (id) => {
        setSelectedCollegeId(id);
        setTimeout(() => {
            document.getElementById(`row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    };

    const SortIcon = ({ columnKey }) => {
        if (sortConfig.key !== columnKey) return <div className="w-4 h-4 opacity-0" />;
        return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
    };

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="bg-blue-600 p-2 rounded-lg">
                            <Award className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 truncate hidden sm:block">
                            College Tracker
                        </h1>
                    </div>
                    {/* School Selector */}
                    <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-slate-600 hidden md:block">Select School:</span>
                        <select
                            className="bg-slate-100 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                            value={selectedSchoolId}
                            onChange={(e) => setSelectedSchoolId(e.target.value)}
                        >
                            <option value="SYCAMORE">Sycamore High School</option>
                            <option value="NEUQUA">Neuqua Valley High School</option>
                        </select>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6">

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <MetricCard title="Total Attending" value={stats.totalAttending} subtext="Students confirmed" icon={Users} colorClass="text-blue-600 bg-blue-600" />
                    <MetricCard title="Total Acceptances" value={stats.totalAccepted} subtext="Admissions offers" icon={TrendingUp} colorClass="text-emerald-600 bg-emerald-600" />
                    <MetricCard title="Avg. Acceptance Rate" value={`${stats.avgAcceptanceRate}%`} subtext="Based on available data" icon={Filter} colorClass="text-purple-600 bg-purple-600" />
                    <MetricCard title="Top Destination" value={stats.mostPopular?.name || "N/A"} subtext={`${stats.mostPopular?.attending || 0} students attending`} icon={MapPin} colorClass="text-orange-600 bg-orange-600" />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative h-[600px] sm:h-[700px]">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10 bg-white">
                        <h2 className="font-semibold text-slate-800 flex items-center text-sm sm:text-base">
                            <MapPin className="w-5 h-5 mr-2 text-slate-500" />
                            Geographic Distribution
                        </h2>
                        <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                            <button className={`flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs font-medium rounded-md transition-all ${vizMode === 'attending' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setVizMode('attending')}>By Attendance</button>
                            <button className={`flex-1 sm:flex-none px-3 py-2 sm:py-1 text-xs font-medium rounded-md transition-all ${vizMode === 'acceptance' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => setVizMode('acceptance')}>By Acceptance Rate</button>
                        </div>
                    </div>
                    <div className="flex-1 relative z-0 min-h-0">
                        <TileMap data={colleges} onSelect={handleMapSelect} vizMode={vizMode} filters={filters} toggleFilter={toggleFilter} />
                    </div>
                </div>

                {/* Analytics Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SimpleBarChart data={chartData.topAttending} title="Top Colleges by Attendance" color="#3b82f6" />
                    <DotPlot data={chartData.rateDist} title="Acceptance Rate Distribution" />
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <h2 className="font-semibold text-slate-800">College Data</h2>
                        <div className="relative w-full sm:w-auto">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input type="text" placeholder="Search colleges..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[600px] overscroll-contain">
                        <table className="w-full text-left text-sm text-slate-600 relative min-w-[600px]">
                            <thead className="bg-slate-50 text-slate-700 font-medium border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('name')}>
                                        <div className="flex items-center space-x-1"><span>College Name</span><SortIcon columnKey="name" /></div>
                                    </th>
                                    <th className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('state')}>
                                        <div className="flex items-center space-x-1"><span>Location</span><SortIcon columnKey="state" /></div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('attending')}>
                                        <div className="flex items-center justify-end space-x-1"><span>Attending</span><SortIcon columnKey="attending" /></div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('accepted')}>
                                        <div className="flex items-center justify-end space-x-1"><span>Total Accepted</span><SortIcon columnKey="accepted" /></div>
                                    </th>
                                    <th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => handleSort('rate')}>
                                        <div className="flex items-center justify-end space-x-1"><span>Acceptance Rate</span><SortIcon columnKey="rate" /></div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredColleges.map((college) => (
                                    <tr key={college.id} id={`row-${college.id}`} className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedCollegeId === college.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedCollegeId(college.id)}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">{college.name}</div>
                                            <div className="text-xs text-slate-400 sm:hidden">{college.city}, {college.state}</div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">{college.city}, {college.state}</td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-900">{college.attending}</td>
                                        <td className="px-6 py-4 text-right">{college.accepted}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${college.rate ? 'bg-slate-100 text-slate-800' : 'bg-slate-50 text-slate-400'}`}>
                                                {college.rate ? `${college.rate}%` : 'N/A'}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl text-xs text-slate-500 flex justify-between">
                        <span>Showing {filteredColleges.length} colleges</span>
                        <span>Data source: Uploaded CSV (Enriched)</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
