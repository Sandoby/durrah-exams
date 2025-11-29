import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartProps {
    data: any[];
    xKey: string;
    yKey: string;
    title?: string;
    color?: string;
    height?: number;
}

export const BarChart = ({ data, xKey, yKey, title, color = '#6366f1', height = 300 }: BarChartProps) => {
    return (
        <div className="w-full">
            {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>}
            <ResponsiveContainer width="100%" height={height}>
                <RechartsBarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                    <XAxis
                        dataKey={xKey}
                        className="text-gray-600 dark:text-gray-400"
                        tick={{ fill: 'currentColor' }}
                    />
                    <YAxis
                        className="text-gray-600 dark:text-gray-400"
                        tick={{ fill: 'currentColor' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: '1px solid #e5e7eb',
                            borderRadius: '0.5rem'
                        }}
                    />
                    <Legend />
                    <Bar dataKey={yKey} fill={color} radius={[8, 8, 0, 0]} />
                </RechartsBarChart>
            </ResponsiveContainer>
        </div>
    );
};
