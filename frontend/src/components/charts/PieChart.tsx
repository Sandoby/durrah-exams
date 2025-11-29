import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface PieChartProps {
    data: any[];
    nameKey: string;
    valueKey: string;
    title?: string;
    colors?: string[];
    height?: number;
}

const DEFAULT_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6'];

export const PieChart = ({
    data,
    nameKey,
    valueKey,
    title,
    colors = DEFAULT_COLORS,
    height = 300
}: PieChartProps) => {
    return (
        <div className="w-full">
            {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>}
            <ResponsiveContainer width="100%" height={height}>
                <RechartsPieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey={valueKey}
                        nameKey={nameKey}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                </RechartsPieChart>
            </ResponsiveContainer>
        </div>
    );
};
