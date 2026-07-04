'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useUsage } from '@/hooks/use-queries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ROOM_LABELS } from '@/lib/types';

export function PowerChart() {
  const { data, isLoading } = useUsage();

  const chartData = data
    ? [
        { room: ROOM_LABELS.drawing, watts: data.roomBreakdown.drawing },
        { room: ROOM_LABELS.work1, watts: data.roomBreakdown.work1 },
        { room: ROOM_LABELS.work2, watts: data.roomBreakdown.work2 },
      ]
    : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Power by Room</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="room"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickLine={false}
                  axisLine={false}
                  unit=" W"
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                    color: 'hsl(var(--card-foreground))',
                  }}
                  formatter={(value: number) => [`${value} W`, 'Power']}
                />
                <Bar
                  dataKey="watts"
                  fill="hsl(var(--primary))"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={72}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
