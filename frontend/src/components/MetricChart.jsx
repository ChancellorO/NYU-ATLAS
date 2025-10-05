// map.jsx
import "mapbox-gl/dist/mapbox-gl.css";

// Chakra Charts (theme-aware wrappers around Recharts)
import { Chart, useChart } from "@chakra-ui/charts";
import {
  LineChart as RLineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";

import { Card } from "@chakra-ui/react";
import {
  Box
} from "@chakra-ui/react";

function MetricChart({
  title,
  data,
  color = "teal.solid",
  height = 280,
  xLabel = "Year",
  yLabel = "Value",
  yWidth = 64,
}) {
  const chart = useChart({
    data,
    series: [{ name: "value", color }],
  });

  return (
    <Card.Root backgroundColor={"#f9f9f9"}>
      <Card.Body gap="2" px="3" py="3">
        <Card.Description>{title}</Card.Description>
        <Box w="100%" h={`${height}px`} px="0" mx="0">
          <Chart.Root chart={chart} w="100%" h="100%">
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart
                data={chart.data}
                margin={{ top: 8, right: 8, bottom: 28, left: 0 }}
              >
                <CartesianGrid stroke={chart.color("border")} vertical={false} />

                <XAxis dataKey={chart.key("name")} stroke={chart.color("border")}>
                  <Label value={xLabel} position="insideBottom" offset={-4} />
                </XAxis>

                <YAxis stroke={chart.color("border")} width={yWidth} tickMargin={6}>
                  <Label value={yLabel} angle={-90} position="left" />
                </YAxis>

                <Tooltip animationDuration={100} cursor={false} content={<Chart.Tooltip />} />
                <Line
                  isAnimationActive={false}
                  dataKey={chart.key("value")}
                  stroke={chart.color(color)}
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  type="monotone"
                />
              </RLineChart>
            </ResponsiveContainer>
          </Chart.Root>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}