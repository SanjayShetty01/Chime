import { CategoryBreakdown } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface Props {
  breakdown: CategoryBreakdown[];
}

const COLORS = [
  "hsl(210, 70%, 50%)",
  "hsl(340, 65%, 50%)",
  "hsl(30, 85%, 50%)",
  "hsl(160, 60%, 40%)",
  "hsl(270, 55%, 55%)",
  "hsl(50, 80%, 50%)",
];

const CategoryCharts = ({ breakdown }: Props) => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Spend by category – bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category-wise Spend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={breakdown}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="category" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => `₹${value.toLocaleString("en-IN")}`}
                contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
              />
              <Bar dataKey="spend" fill="hsl(210, 70%, 50%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cashback by category – pie chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cashback Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={breakdown}
                dataKey="cashback"
                nameKey="category"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ category, cashback }) => `${category}: ₹${cashback.toFixed(0)}`}
                labelLine={false}
              >
                {breakdown.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default CategoryCharts;
