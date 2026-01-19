import React from 'react';
import { getMarkerColor } from './TileMap';

export const SimpleBarChart = ({ data, title, color }) => {
    const maxVal = Math.max(...data.map(d => d.value));
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
            <div className="space-y-3">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center text-xs">
                        <span className="w-24 text-slate-500 truncate">{d.label}</span>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full mx-3 overflow-hidden">
                            <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${(d.value / maxVal) * 100}%`, backgroundColor: color }}
                            />
                        </div>
                        <span className="w-8 text-right font-medium text-slate-700">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export const DotPlot = ({ data, title }) => {
    // Filter out invalid rates
    const validData = data.filter(d => d.rate !== null && d.rate !== undefined).sort((a, b) => a.rate - b.rate);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-full">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
            <div className="relative h-48 w-full">
                {/* Axis Line */}
                <div className="absolute bottom-6 left-4 right-4 h-px bg-slate-300"></div>

                {/* Axis Labels */}
                <div className="absolute bottom-0 left-4 text-xs text-slate-400">0%</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-xs text-slate-400">50%</div>
                <div className="absolute bottom-0 right-4 text-xs text-slate-400">100%</div>
                <div className="absolute bottom-0 w-full text-center text-[10px] text-slate-400 font-medium -mb-4">Acceptance Rate</div>

                {/* Dots */}
                {validData.map((d) => {
                    // Add random jitter to Y to prevent overlap
                    // Using a deterministic hash of ID for stable jitter
                    const jitter = (d.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 80) + 10;

                    return (
                        <div
                            key={d.id}
                            className="absolute w-2 h-2 rounded-full border border-white shadow-sm hover:w-3 hover:h-3 hover:z-10 transition-all cursor-pointer group"
                            style={{
                                left: `${d.rate}%`,
                                bottom: `${jitter}%`, // Random vertical position
                                backgroundColor: getMarkerColor(d, 'acceptance'),
                                opacity: 0.7
                            }}
                        >
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
                                {d.name}: {d.rate}%
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="mt-6 text-[10px] text-slate-400 text-center italic">
                Each dot represents a college. Vertical position is randomized for visibility.
            </div>
        </div>
    );
};
