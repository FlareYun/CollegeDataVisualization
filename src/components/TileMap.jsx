import React, { useState, useRef, useEffect } from 'react';
import { Plus, Minus, Layers, Eye, EyeOff } from 'lucide-react';

const TILE_SIZE = 256;

const latLngToPx = (lat, lng, zoom) => {
    const n = Math.pow(2, zoom);
    const x = ((lng + 180) / 360) * n * TILE_SIZE;
    const latRad = (lat * Math.PI) / 180;
    const y = (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * n * TILE_SIZE;
    return { x, y };
};

const pxToLatLng = (x, y, zoom) => {
    const n = Math.pow(2, zoom);
    const lng = (x / (n * TILE_SIZE)) * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / (n * TILE_SIZE))));
    const lat = (latRad * 180) / Math.PI;
    return { lat, lng };
};

const COLORS = {
    ATTENDING: {
        HIGH: { color: '#ef4444', label: '50+ Students', radius: 24 },
        MED: { color: '#f97316', label: '20-49 Students', radius: 18 },
        LOW: { color: '#eab308', label: '10-19 Students', radius: 14 },
        VERY_LOW: { color: '#84cc16', label: '5-9 Students', radius: 10 },
        MIN: { color: '#3b82f6', label: '1-4 Students', radius: 6 },
    },
    ACCEPTANCE: {
        EXTREME: { color: '#7f1d1d', label: '< 5% Rate', radius: 24 },
        VERY_LOW: { color: '#b91c1c', label: '5-10% Rate', radius: 20 },
        LOW: { color: '#ef4444', label: '10-20% Rate', radius: 16 },
        SELECTIVE: { color: '#f97316', label: '20-50% Rate', radius: 12 },
        MODERATE: { color: '#eab308', label: '50-80% Rate', radius: 10 },
        OPEN: { color: '#22c55e', label: '> 80% Rate', radius: 8 },
    }
};

export const getMarkerColor = (college, mode) => {
    if (mode === 'attending') {
        if (college.attending >= 50) return COLORS.ATTENDING.HIGH.color;
        if (college.attending >= 20) return COLORS.ATTENDING.MED.color;
        if (college.attending >= 10) return COLORS.ATTENDING.LOW.color;
        if (college.attending >= 5) return COLORS.ATTENDING.VERY_LOW.color;
        return COLORS.ATTENDING.MIN.color;
    } else {
        if (!college.rate) return '#94a3b8';
        if (college.rate < 5) return COLORS.ACCEPTANCE.EXTREME.color;
        if (college.rate < 10) return COLORS.ACCEPTANCE.VERY_LOW.color;
        if (college.rate < 20) return COLORS.ACCEPTANCE.LOW.color;
        if (college.rate < 50) return COLORS.ACCEPTANCE.SELECTIVE.color;
        if (college.rate < 80) return COLORS.ACCEPTANCE.MODERATE.color;
        return COLORS.ACCEPTANCE.OPEN.color;
    }
};

export const getCategoryKey = (college, mode) => {
    if (mode === 'attending') {
        if (college.attending >= 50) return 'HIGH';
        if (college.attending >= 20) return 'MED';
        if (college.attending >= 10) return 'LOW';
        if (college.attending >= 5) return 'VERY_LOW';
        return 'MIN';
    } else {
        if (!college.rate) return 'UNKNOWN';
        if (college.rate < 5) return 'EXTREME';
        if (college.rate < 10) return 'VERY_LOW';
        if (college.rate < 20) return 'LOW';
        if (college.rate < 50) return 'SELECTIVE';
        if (college.rate < 80) return 'MODERATE';
        return 'OPEN';
    }
};

const getMarkerRadius = (college, mode) => {
    if (mode === 'attending') {
        const attending = college.attending;
        if (attending >= 50) return COLORS.ATTENDING.HIGH.radius;
        if (attending >= 20) return COLORS.ATTENDING.MED.radius;
        if (attending >= 10) return COLORS.ATTENDING.LOW.radius;
        if (attending >= 5) return COLORS.ATTENDING.VERY_LOW.radius;
        return COLORS.ATTENDING.MIN.radius;
    }
    if (mode === 'acceptance') {
        const rate = college.rate;
        if (!rate) return 8;
        if (rate < 5) return COLORS.ACCEPTANCE.EXTREME.radius;
        if (rate < 10) return COLORS.ACCEPTANCE.VERY_LOW.radius;
        if (rate < 20) return COLORS.ACCEPTANCE.LOW.radius;
        if (rate < 50) return COLORS.ACCEPTANCE.SELECTIVE.radius;
        if (rate < 80) return COLORS.ACCEPTANCE.MODERATE.radius;
        return COLORS.ACCEPTANCE.OPEN.radius;
    }
    return 6;
};

const FilterToggle = ({ label, color, filterKey, radius, filters, toggleFilter }) => (
    <button onClick={() => toggleFilter(filterKey)} className={`flex items-center space-x-2 text-xs py-2 px-2 rounded-md transition-colors w-full touch-manipulation ${filters[filterKey] !== false ? 'hover:bg-slate-100' : 'opacity-50 grayscale'}`}>
        {filters[filterKey] !== false ? <Eye className="w-4 h-4 text-slate-400" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
        <div className="w-6 flex justify-center">
            <span className="rounded-full inline-block" style={{ backgroundColor: color, width: radius ? radius : 8, height: radius ? radius : 8 }}></span>
        </div>
        <span className="text-slate-700">{label}</span>
    </button>
);

const TileMap = ({ data, onSelect, vizMode, filters, toggleFilter }) => {
    const containerRef = useRef(null);
    const [viewport, setViewport] = useState({ lat: 39.8283, lng: -98.5795, zoom: 4 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [startViewport, setStartViewport] = useState({ lat: 0, lng: 0 });
    const [hoveredId, setHoveredId] = useState(null);
    const [dragDistance, setDragDistance] = useState(0);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                setDimensions({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };

        // Initial check
        updateDimensions();

        const observer = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        const element = containerRef.current;
        if (!element) return;
        const onWheel = (e) => {
            // ... existing onWheel ...
            e.preventDefault();
            const rect = element.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            const currentZoom = viewport.zoom;
            const zoomDelta = e.deltaY > 0 ? -0.5 : 0.5;
            let newZoom = Math.min(Math.max(currentZoom + zoomDelta, 2), 12);
            const centerPx = latLngToPx(viewport.lat, viewport.lng, currentZoom);
            const tlPx = { x: centerPx.x - rect.width / 2, y: centerPx.y - rect.height / 2 };
            const mouseWorldPx = { x: tlPx.x + mouseX, y: tlPx.y + mouseY };
            const mouseLatLng = pxToLatLng(mouseWorldPx.x, mouseWorldPx.y, currentZoom);
            const newMouseWorldPx = latLngToPx(mouseLatLng.lat, mouseLatLng.lng, newZoom);
            const newTlPx = { x: newMouseWorldPx.x - mouseX, y: newMouseWorldPx.y - mouseY };
            const newCenterPx = { x: newTlPx.x + rect.width / 2, y: newTlPx.y + rect.height / 2 };
            const newCenter = pxToLatLng(newCenterPx.x, newCenterPx.y, newZoom);
            setViewport({ lat: newCenter.lat, lng: newCenter.lng, zoom: newZoom });
        };
        element.addEventListener('wheel', onWheel, { passive: false });
        return () => element.removeEventListener('wheel', onWheel);
    }, [viewport]);

    const zoomIn = () => setViewport(prev => ({ ...prev, zoom: Math.min(prev.zoom + 1, 12) }));
    const zoomOut = () => setViewport(prev => ({ ...prev, zoom: Math.max(prev.zoom - 1, 2) }));

    const startDrag = (clientX, clientY) => {
        setIsDragging(true);
        setDragDistance(0);
        setDragStart({ x: clientX, y: clientY });
        setStartViewport({ lat: viewport.lat, lng: viewport.lng });
    };

    const onDrag = (clientX, clientY) => {
        if (!isDragging) return;
        const dx = clientX - dragStart.x;
        const dy = clientY - dragStart.y;
        setDragDistance(prev => prev + Math.abs(dx) + Math.abs(dy));
        const centerPx = latLngToPx(startViewport.lat, startViewport.lng, viewport.zoom);
        const newCenterPx = { x: centerPx.x - dx, y: centerPx.y - dy };
        const newCenter = pxToLatLng(newCenterPx.x, newCenterPx.y, viewport.zoom);
        setViewport(prev => ({ ...prev, lat: newCenter.lat, lng: newCenter.lng }));
    };

    const endDrag = () => setIsDragging(false);

    const handleMouseDown = (e) => { e.preventDefault(); startDrag(e.clientX, e.clientY); };
    const handleMouseMove = (e) => { e.preventDefault(); onDrag(e.clientX, e.clientY); };
    const handleMouseUp = endDrag;
    const handleMouseLeave = endDrag;
    const handleTouchStart = (e) => { if (e.touches.length === 1) startDrag(e.touches[0].clientX, e.touches[0].clientY); };
    const handleTouchMove = (e) => { if (e.touches.length === 1) { e.preventDefault(); onDrag(e.touches[0].clientX, e.touches[0].clientY); } };
    const handleTouchEnd = endDrag;
    const handleMarkerClick = (e, id) => { e.stopPropagation(); if (dragDistance < 5) onSelect(id); };

    const { width, height } = dimensions;
    const centerPx = latLngToPx(viewport.lat, viewport.lng, viewport.zoom);
    const viewportTlPx = { x: centerPx.x - width / 2, y: centerPx.y - height / 2 };
    const tileZoom = Math.floor(viewport.zoom);
    const scale = Math.pow(2, viewport.zoom - tileZoom);
    const centerPxTile = latLngToPx(viewport.lat, viewport.lng, tileZoom);
    const viewportTlPxTile = { x: centerPxTile.x - (width / scale) / 2, y: centerPxTile.y - (height / scale) / 2 };
    const startTileX = Math.floor(viewportTlPxTile.x / TILE_SIZE);
    const startTileY = Math.floor(viewportTlPxTile.y / TILE_SIZE);
    const endTileX = Math.ceil((viewportTlPxTile.x + (width / scale)) / TILE_SIZE);
    const endTileY = Math.ceil((viewportTlPxTile.y + (height / scale)) / TILE_SIZE);

    const tiles = [];
    for (let x = startTileX; x < endTileX; x++) {
        for (let y = startTileY; y < endTileY; y++) {
            const wrappedX = ((x % Math.pow(2, tileZoom)) + Math.pow(2, tileZoom)) % Math.pow(2, tileZoom);
            const tileLeft = (x * TILE_SIZE - viewportTlPxTile.x) * scale;
            const tileTop = (y * TILE_SIZE - viewportTlPxTile.y) * scale;
            const url = `https://a.basemaps.cartocdn.com/light_all/${tileZoom}/${wrappedX}/${y}.png`;
            tiles.push(<img key={`${tileZoom}-${x}-${y}`} src={url} alt="" draggable="false" style={{ position: 'absolute', left: tileLeft, top: tileTop, width: TILE_SIZE * scale, height: TILE_SIZE * scale, pointerEvents: 'none', userSelect: 'none' }} />);
        }
    }

    const markers = data.map(college => {
        if (!college.lat || !college.lng || (college.lat === 0 && college.lng === 0)) return null;
        const category = getCategoryKey(college, vizMode);
        if (filters[category] === false) return null;
        const px = latLngToPx(college.lat, college.lng, viewport.zoom);
        const left = px.x - viewportTlPx.x;
        const top = px.y - viewportTlPx.y;
        if (left < -50 || left > width + 50 || top < -50 || top > height + 50) return null;
        const radius = getMarkerRadius(college, vizMode);
        const color = getMarkerColor(college, vizMode);
        const isHovered = hoveredId === college.id;
        return (
            <div key={college.id} className="absolute flex items-center justify-center cursor-pointer transition-transform duration-200" style={{ left: left - radius, top: top - radius, width: radius * 2, height: radius * 2, zIndex: isHovered ? 100 : 10, transform: isHovered ? 'scale(1.2)' : 'scale(1)' }} onClick={(e) => handleMarkerClick(e, college.id)} onMouseEnter={() => setHoveredId(college.id)} onMouseLeave={() => setHoveredId(null)}>
                <div style={{ width: '100%', height: '100%', backgroundColor: color, borderRadius: '50%', opacity: 0.8, boxShadow: '0 2px 4px rgba(0,0,0,0.3)', border: '2px solid white' }} />
                {isHovered && (
                    <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white text-xs py-2 px-3 rounded shadow-xl whitespace-nowrap z-50 pointer-events-none">
                        <div className="font-bold text-sm">{college.name}</div>
                        <div className="mt-1">Attending: <span className="font-mono">{college.attending}</span></div>
                        <div className="opacity-90">Acceptance: <span className="font-mono">{college.rate ? `${college.rate}%` : 'N/A'}</span></div>
                        <div className="opacity-75 text-[10px] mt-1 uppercase tracking-wide">{college.city}, {college.state}</div>
                    </div>
                )}
            </div>
        );
    });

    return (
        <div className="relative w-full h-full bg-slate-100 overflow-hidden rounded-lg border border-slate-200 select-none touch-none" ref={containerRef} onDragStart={(e) => e.preventDefault()}>
            <div className="w-full h-full relative cursor-grab active:cursor-grabbing touch-none" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseLeave} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                {tiles}{markers}
            </div>
            <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-20">
                <button onClick={zoomIn} className="p-3 bg-white rounded-lg shadow-md hover:bg-slate-50 border border-slate-200 active:bg-slate-100"><Plus className="w-6 h-6 text-slate-600" /></button>
                <button onClick={zoomOut} className="p-3 bg-white rounded-lg shadow-md hover:bg-slate-50 border border-slate-200 active:bg-slate-100"><Minus className="w-6 h-6 text-slate-600" /></button>
            </div>
            <div className="absolute bottom-6 left-4 sm:left-6 bg-white/95 p-3 sm:p-4 rounded-xl shadow-lg border border-slate-200 text-xs backdrop-blur-sm z-20 w-48 sm:w-56 max-h-[300px] overflow-y-auto">
                <div className="font-semibold mb-3 text-slate-800 flex items-center justify-between">
                    <span>Legend & Filters</span>
                    <Layers className="w-3 h-3 text-slate-400" />
                </div>
                <div className="space-y-1">
                    {vizMode === 'attending' ? (
                        <>
                            <FilterToggle label={COLORS.ATTENDING.HIGH.label} color={COLORS.ATTENDING.HIGH.color} filterKey="HIGH" radius={12} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label={COLORS.ATTENDING.MED.label} color={COLORS.ATTENDING.MED.color} filterKey="MED" radius={9} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label={COLORS.ATTENDING.LOW.label} color={COLORS.ATTENDING.LOW.color} filterKey="LOW" radius={7} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label={COLORS.ATTENDING.VERY_LOW.label} color={COLORS.ATTENDING.VERY_LOW.color} filterKey="VERY_LOW" radius={5} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label={COLORS.ATTENDING.MIN.label} color={COLORS.ATTENDING.MIN.color} filterKey="MIN" radius={3} filters={filters} toggleFilter={toggleFilter} />
                        </>
                    ) : (
                        <>
                            <FilterToggle label={COLORS.ACCEPTANCE.EXTREME.label} color={COLORS.ACCEPTANCE.EXTREME.color} filterKey="EXTREME" radius={6} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label={COLORS.ACCEPTANCE.VERY_LOW.label} color={COLORS.ACCEPTANCE.VERY_LOW.color} filterKey="VERY_LOW" radius={6} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label={COLORS.ACCEPTANCE.LOW.label} color={COLORS.ACCEPTANCE.LOW.color} filterKey="LOW" radius={6} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label={COLORS.ACCEPTANCE.SELECTIVE.label} color={COLORS.ACCEPTANCE.SELECTIVE.color} filterKey="SELECTIVE" radius={6} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label={COLORS.ACCEPTANCE.MODERATE.label} color={COLORS.ACCEPTANCE.MODERATE.color} filterKey="MODERATE" radius={6} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label={COLORS.ACCEPTANCE.OPEN.label} color={COLORS.ACCEPTANCE.OPEN.color} filterKey="OPEN" radius={6} filters={filters} toggleFilter={toggleFilter} />
                            <FilterToggle label="Unknown Rate" color="#94a3b8" filterKey="UNKNOWN" radius={6} filters={filters} toggleFilter={toggleFilter} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TileMap;
