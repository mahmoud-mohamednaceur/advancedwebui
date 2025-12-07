import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Mon', docs: 4, queries: 240 },
  { name: 'Tue', docs: 3, queries: 139 },
  { name: 'Wed', docs: 20, queries: 980 },
  { name: 'Thu', docs: 27, queries: 390 },
  { name: 'Fri', docs: 18, queries: 480 },
  { name: 'Sat', docs: 23, queries: 380 },
  { name: 'Sun', docs: 34, queries: 430 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0E0E12] border border-white/10 p-4 rounded-lg shadow-xl">
          <p className="text-white font-bold mb-2">{label}</p>
          <p className="text-primary text-sm">Queries: {payload[1].value}</p>
          <p className="text-secondary text-sm">Docs Added: {payload[0].value}</p>
        </div>
      );
    }
    return null;
};

const PlaygroundChart: React.FC = () => {
  return (
    <div className="p-6 md:p-10 h-full flex flex-col">
        <div className="mb-8">
           <h2 className="text-2xl font-bold text-white mb-2">Analytics</h2>
           <p className="text-text-subtle">Usage trends and retrieval statistics.</p>
        </div>

        <div className="flex-1 bg-[#0E0E12] border border-white/10 rounded-2xl p-6 shadow-lg min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg font-bold text-white">Weekly Activity</h3>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-xs text-text-subtle">
                        <div className="w-3 h-3 bg-[#E03B8A] rounded-sm"></div>
                        <span>Docs Added</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-text-subtle">
                        <div className="w-3 h-3 bg-[#7EF9FF] rounded-sm"></div>
                        <span>Queries</span>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 w-full h-full min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="name" stroke="#666" tick={{fill: '#666', fontSize: 12}} tickLine={false} axisLine={false} />
                        <YAxis stroke="#666" tick={{fill: '#666', fontSize: 12}} tickLine={false} axisLine={false} />
                        <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                        <Bar dataKey="docs" fill="#E03B8A" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="queries" fill="#7EF9FF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};

export default PlaygroundChart;