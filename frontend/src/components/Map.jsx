// map.jsx
import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";
import Search from "./Search";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import mockReport from "../mock.json";

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
  BarChart as RBarChart,
  Bar,
  LabelList,
  Cell,
  Label,
} from "recharts";

import { Card } from "@chakra-ui/react";
import {
  Flex,
  Heading,
  ScrollArea,
  Image,
  Container,
  Table,
  Box,
  Text,
  Button,
  DownloadTrigger,
  Spinner,
  HStack,
  Badge,
} from "@chakra-ui/react";
import MapDatePicker from "./DatePicker";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

/* ---------- Small reusable chart card that fills its container ---------- */
function MetricChart({
  title,
  data,
  color = "teal.solid",
  height = 280,
  xLabel = "Year",
  yLabel = "Value",
  yWidth = 64, // reserve enough room for label + ticks
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
                // extra bottom margin so the X-axis label has room
                margin={{ top: 8, right: 8, bottom: 28, left: 0 }}
              >
                <CartesianGrid stroke={chart.color("border")} vertical={false} />

                <XAxis dataKey={chart.key("name")} stroke={chart.color("border")}>
                  <Label value={xLabel} position="insideBottom" offset={-4} />
                </XAxis>

                <YAxis stroke={chart.color("border")} width={yWidth} tickMargin={6}>
                  {/* Put the label OUTSIDE the ticks so it never overlaps */}
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

/* ---------- Probability (bar) chart ---------- */
function ProbabilityChart({
  title,
  data,
  defaultColor = "teal.solid",
  height = 260,
  xLabel = "Event",
  yLabel = "Probability (%)",
  yWidth = 64,
}) {
  const chart = useChart({
    data,
    series: [{ name: "value", color: defaultColor }],
  });

  return (
    <Card.Root w="full" maxW="full" overflow="hidden" bg="#f9f9f9">
      <Card.Body gap="2" px="3" py="3">
        <Card.Description>{title}</Card.Description>
        <Box w="full" h={`${height}px`} minW={0} overflow="visible">
          <Chart.Root chart={chart} w="100%" h="100%">
            <ResponsiveContainer width="100%" height="100%">
              <RBarChart data={chart.data} margin={{ top: 8, right: 8, bottom: 28, left: 0 }}>
                <CartesianGrid stroke={chart.color("border")} vertical={false} />

                <XAxis dataKey={chart.key("name")} stroke={chart.color("border")}>
                  <Label value={xLabel} position="insideBottom" offset={-4} />
                </XAxis>

                <YAxis stroke={chart.color("border")} width={yWidth} tickMargin={6}>
                  <Label value={yLabel} angle={-90} position="left" offset={4} />
                </YAxis>

                <Tooltip animationDuration={100} cursor={false} content={<Chart.Tooltip />} />
                <Bar dataKey={chart.key("value")}>
                  <LabelList
                    dataKey={chart.key("value")}
                    position="top"
                    formatter={(v) => `${Number(v).toFixed(1)}%`}
                  />
                  {chart.data.map((d, i) => (
                    <Cell key={i} fill={d.color || chart.color(defaultColor)} />
                  ))}
                </Bar>
              </RBarChart>
            </ResponsiveContainer>
          </Chart.Root>
        </Box>
      </Card.Body>
    </Card.Root>
  );
}

/* ---------- Mini HEATMAP (replaces MiniMap) ---------- */
function MiniHeatMap({ lng, lat, fc, events, height = 260, zoom = 10, isPastDate }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);

  // Pick a metric & compute a 0..1 weight
  const precip = Number(fc?.precip_mm_day ?? NaN);
  const wind   = Number(fc?.["Wind speed (m/s)"] ?? NaN);
  const temp   = Number(fc?.["Temperature (°C)"] ?? NaN);

  let metricName = "Precip (mm/day)";
  let metricValue = Number.isFinite(precip) ? precip : Number.isFinite(wind) ? wind : temp;
  let scale = Number.isFinite(precip) ? 40 : Number.isFinite(wind) ? 20 : 45; // rough scales
  let weight = Math.max(0, Math.min(1, (Number.isFinite(metricValue) ? metricValue : 0) / scale));

  // Color ramps (vary by event type)
  const rampRain = [
    0,   "rgba(33,102,172,0.0)",
    0.2, "rgb(103,169,207)",
    0.4, "rgb(209,229,240)",
    0.6, "rgb(253,219,199)",
    0.8, "rgb(239,138,98)",
    1,   "rgb(178,24,43)",
  ];
  const rampSnow = [
    0,   "rgba(0,90,170,0.0)",
    0.2, "rgb(173,216,230)",
    0.4, "rgb(160,200,255)",
    0.6, "rgb(120,170,255)",
    0.8, "rgb(70,130,180)",
    1,   "rgb(25,70,140)",
  ];
  const rampHeat = [
    0,   "rgba(255,200,120,0.0)",
    0.2, "rgb(255,220,150)",
    0.4, "rgb(255,200,120)",
    0.6, "rgb(255,170,80)",
    0.8, "rgb(255,120,40)",
    1,   "rgb(220,60,20)",
  ];
  const rampStorm = [
    0,   "rgba(80,0,120,0.0)",
    0.2, "rgb(120,60,180)",
    0.4, "rgb(160,80,200)",
    0.6, "rgb(190,90,210)",
    0.8, "rgb(230,110,230)",
    1,   "rgb(255,130,255)",
  ];

  const colorRamp = events?.Snow
    ? rampSnow
    : events?.["Extreme Heat"]
    ? rampHeat
    : events?.Thunderstorm
    ? rampStorm
    : rampRain;

  // Mount the mini map with a 1-point heat layer
  useEffect(() => {
    if (!elRef.current || lng == null || lat == null) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: elRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [lng, lat],
      zoom,
      interactive: false,
    });

    const makeData = () => ({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry: { type: "Point", coordinates: [lng, lat] },
          properties: { weight },
        },
      ],
    });

    map.on("load", () => {
      map.addSource("forecast-pt", { type: "geojson", data: makeData() });

      map.addLayer({
        id: "forecast-heat",
        type: "heatmap",
        source: "forecast-pt",
        maxzoom: 16,
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": 1.0,
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 30, 14, 80],
          "heatmap-opacity": 0.85,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], ...colorRamp],
        },
      });

      // small center marker for precision
      map.addLayer({
        id: "forecast-center",
        type: "circle",
        source: "forecast-pt",
        paint: {
          "circle-radius": 4,
          "circle-color": events?.Snow
            ? "#4f83cc"
            : events?.["Extreme Heat"]
            ? "#ff7a33"
            : events?.Thunderstorm
            ? "#9a4bff"
            : "#2b6cb0",
          "circle-stroke-width": 1,
          "circle-stroke-color": "#ffffff",
        },
      });
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(elRef.current);

    mapRef.current = map;
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [lng, lat, zoom]); // re-create if position changes

  // Update weight when the forecast row changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map?.isStyleLoaded?.()) return;
    const src = map.getSource("forecast-pt");
    if (src?.setData) {
      src.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [lng, lat] },
            properties: { weight },
          },
        ],
      });
    }
  }, [lng, lat, weight]);

  return (
    <Box>
      <Box ref={elRef} w="full" h={`${height}px`} borderRadius="md" overflow="hidden" />
      <Text mt="2" fontSize="sm" color="gray.600" textAlign="center">
        {isPastDate ? "Historical intensity" : "Forecast intensity"} •{" "}
        <strong>{Number.isFinite(metricValue) ? metricValue.toFixed(1) : "—"}</strong> {metricName}
      </Text>
    </Box>
  );
}


/* ---------- Helpers ---------- */
const toISODate = (d) =>
  typeof d === "string" ? d.slice(0, 10) : d?.toISOString().slice(0, 10);

/* ---------- Main Map ---------- */
const Map = forwardRef(function Map(
  {
    apiUrl="ADD URL HERE",
    initialCenter = [-73.9855, 40.758],
    initialZoom = 11,
    onMove,
    className = "map-container",
    setBotMessage,
  },
  ref
) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  const [inputValue, setInputValue] = useState("");
  const [coordinates, setCoordinates] = useState(null); // {lng, lat}
  const [properties, setProperties] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [date, setDate] = useState(null); // Date or ISO string
  const [report, setReport] = useState(null); // from backend
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // keep/restore the style's original sky/fog
  const defaultFogRef = useRef(null);

  // style readiness + latest state for style.load replay
  const [styleReady, setStyleReady] = useState(false);
  const latestEventsRef = useRef(null);
  const latestStageRef = useRef("idle");

  const resetUI = () => {
    setInputValue("");
    setCoordinates(null);
    setProperties(null);
    setPhotoUrl(null);
    setDate(null);
    setReport(null);
    setErrorMsg("");
    setLoading(false);
    if (typeof setBotMessage === "function") setBotMessage("");
  };

  useEffect(() => {
    if (inputValue === "") {
      if (coordinates || properties || photoUrl || date || report) resetUI();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue]);

  // Map init
  useEffect(() => {
    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      center: initialCenter,
      zoom: initialZoom,
      pitch: 74,
      bearing: 12.8,
      hash: true,
      style: "mapbox://styles/mapbox/standard",
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");
    mapRef.current = map;

    mapRef.current.on("style.load", () => {
      const m = mapRef.current;
      if (!m) return;

      m.setConfigProperty("basemap", "lightPreset", "dusk");
      defaultFogRef.current = m.getFog();
      setStyleReady(true);

      const shouldApply = latestStageRef.current === "forecast" && latestEventsRef.current;
      applyWeatherEffects(m, shouldApply ? latestEventsRef.current : {});
    });

    return () => map.remove();
  }, []);

  const onMoveRef = useRef(onMove);
  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  useEffect(() => {
    const m = mapRef.current;
    if (!m) return;
    const handler = () => {
      const c = m.getCenter();
      const z = m.getZoom();
      onMoveRef.current?.(c.lng, c.lat, z);
    };
    m.on("move", handler);
    return () => m.off("move", handler);
  }, []);

  useImperativeHandle(ref, () => ({
    flyHome() {
      mapRef.current?.flyTo({ center: initialCenter, zoom: initialZoom });
    },
    flyTo(opts) {
      mapRef.current?.flyTo(opts);
    },
    getMap() {
      return mapRef.current;
    },
  }));

  // Photos
  async function getWikimediaPhotoByName(name) {
    try {
      if (!name) return null;
      const resp = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      return data?.thumbnail?.source || null;
    } catch {
      return null;
    }
  }
  async function getWikimediaPhotoNear(lat, lng) {
    try {
      const geoResp = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}%7C${lng}&gsradius=1000&gslimit=1&format=json&origin=*`
      );
      if (!geoResp.ok) return null;
      const g = await geoResp.json();
      const title = g?.query?.geosearch?.[0]?.title;
      if (!title) return null;

      const sumResp = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
      );
      if (!sumResp.ok) return null;
      const data = await sumResp.json();
      return data?.thumbnail?.source || null;
    } catch {
      return null;
    }
  }

  // stage: idle/place/forecast
  const stage = !coordinates ? "idle" : !date ? "place" : "forecast";
  useEffect(() => {
    latestStageRef.current = stage;
  }, [stage]);
  useEffect(() => {
    latestEventsRef.current = report?.events ?? null;
  }, [report?.events]);

  const handleSelectCoords = async ({ lng, lat, props }) => {
    setCoordinates({ lng, lat });
    setProperties(props);
    setDate(null);
    setReport(null);
    setErrorMsg("");
    setLoading(false);

    let url = await getWikimediaPhotoByName(props?.name);
    if (!url) url = await getWikimediaPhotoNear(lat, lng);
    setPhotoUrl(url || null);
  };

  // ---------- WEATHER EFFECTS ----------
  const zoomBasedReveal = (value) => ["interpolate", ["linear"], ["zoom"], 11, 0.0, 13, value];

  function applyWeatherEffects(map, events = {}) {
    if (!map) return;

    map.setRain?.(null);
    map.setSnow?.(null);
    map.setFog?.(defaultFogRef.current ?? null);

    let lightPreset = "dusk";

    if (events.Rain) {
      map.setRain?.({
        density: zoomBasedReveal(0.5),
        intensity: 1.0,
        color: "#a8adbc",
        opacity: 0.7,
        vignette: zoomBasedReveal(1.0),
        "vignette-color": "#464646",
        direction: [0, 80],
        "droplet-size": [2.6, 18.2],
        "distortion-strength": 0.7,
        "center-thinning": 0,
      });
    }

    if (events.Snow) {
      map.setSnow?.({
        density: zoomBasedReveal(0.85),
        intensity: 1.0,
        "center-thinning": 0.1,
        direction: [0, 50],
        opacity: 1.0,
        color: "#ffffff",
        "flake-size": 0.71,
        vignette: zoomBasedReveal(0.3),
        "vignette-color": "#ffffff",
      });
    }

    if (events.Thunderstorm) {
      map.setFog?.({
        color: "rgb(210,210,210)",
        "horizon-blend": 0.5,
        "high-color": "rgb(36,44,107)",
        "space-color": "rgb(11,11,25)",
        "star-intensity": 0.0,
      });
      lightPreset = "night";
    }

    if (events["Extreme Heat"]) {
      map.setFog?.({
        color: "rgba(255,200,150,0.25)",
        "horizon-blend": 0.25,
        "high-color": "rgba(255,160,120,0.18)",
        "space-color": "rgb(11,11,25)",
        "star-intensity": 0.0,
      });
      lightPreset = "day";
    }

    map.setConfigProperty?.("basemap", "lightPreset", lightPreset);
  }

  // apply/clear when forecast changes (after style ready)
  useEffect(() => {
    const m = mapRef.current;
    if (!m || !styleReady) return;

    if (stage === "forecast" && report?.events) {
      applyWeatherEffects(m, report.events);
    } else {
      applyWeatherEffects(m, {});
    }
  }, [styleReady, stage, report?.events]);

  // ---------- FETCH REPORT WHEN place + date ----------
  const USE_MOCK = false; // switch later if needed

  useEffect(() => {
    if (!coordinates || !date) return;

    if (USE_MOCK) {
      setLoading(true);
      setErrorMsg("");
      const t = setTimeout(() => {
        setReport(mockReport);
        if (typeof setBotMessage === "function") {
          setBotMessage(mockReport?.chatbot || "");
        }
        setLoading(false);
      }, 0);
      return () => clearTimeout(t);
    }

    // --- REAL API (kept here for later) ---
    if (!apiUrl) return;
    const controller = new AbortController();
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrorMsg("");
        const body = {
          lat: coordinates.lat,
          lon: coordinates.lng,
          date: toISODate(date),
        };
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!alive) return;
        setReport(data);
        if (typeof setBotMessage === "function") setBotMessage(data?.chatbot || "");
      } catch (err) {
        if (!alive) return;
        console.error(err);
        setErrorMsg(err?.name === "AbortError" ? "" : "Failed to fetch data. Try again.");
        setReport(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
      controller.abort();
    };
  }, [coordinates, date, apiUrl, setBotMessage]);

  // helpers for cards
  const fmt = (n, d = 2) => (typeof n === "number" && isFinite(n) ? n.toFixed(d) : n ?? "—");
  const merged = report?.tables?.merged?.data ?? [];
  const years = merged.map((r) => String(r.year));

  // Build data arrays for charts
  const tempData = years.map((name, i) => ({ name, value: merged[i]["Temperature (°C)"] }));
  const windData = years.map((name, i) => ({ name, value: merged[i]["Wind speed (m/s)"] }));
  const cloudData = years.map((name, i) => ({ name, value: merged[i]["Cloud-top T (°C)"] }));
  const pressureData = years.map((name, i) => ({ name, value: merged[i]["Pressure (hPa)"] }));

  // Probability (parsed from Plotly-like figure JSON if present)
  const probabilityData = (() => {
    try {
      const raw = report?.figures?.probability;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const t = parsed?.data?.[0];
      const xs = t?.x || [];
      const ys = t?.y || [];
      const colors = Array.isArray(t?.marker?.color) ? t.marker.color : [];
      return xs.map((name, i) => ({
        name,
        value: Number(ys[i] ?? 0),
        color: colors[i],
      }));
    } catch {
      return [];
    }
  })();

  const forecastRows = report?.tables?.forecast?.data ?? [];
  const fcRow = forecastRows?.[0] || null;


  // ---------- Past vs Forecast presentation ----------
  const todayIso = new Date().toISOString().slice(0, 10);
  const selectedIso = date ? toISODate(date) : null;
  const isPastDate = !!selectedIso && selectedIso < todayIso;
  const statusLabel = isPastDate ? "Historical" : "Forecast";
  const statusColor = isPastDate ? "gray" : "blue";
  // ---------------------------------------------------

  // ---------- Download JSON wiring ----------
  const downloadJson = report ? JSON.stringify(report, null, 2) : "";
  const prefix = isPastDate ? "historical" : "forecast";
  const downloadName = `${prefix}_${(properties?.name || "location")
    .replace(/\s+/g, "_")
    .toLowerCase()}_${selectedIso || "date"}.json`;
  // -----------------------------------------

  return (
    <>
      <div ref={containerRef} className={className} id="map-container" />
      <div
        className="map-overlay-style"
        style={{
          background: stage === "idle" ? "transparent" : undefined,
          boxShadow: stage === "idle" ? "none" : undefined,
          padding: stage === "idle" ? 0 : undefined,
          overflow: "hidden",
        }}
      >
        <Search
          accessToken={MAPBOX_TOKEN}
          map={mapRef.current}
          mapboxgl={mapboxgl}
          value={inputValue}
          onChange={(d) => setInputValue(d)}
          onSelectedCoords={handleSelectCoords}
          resetUI={resetUI}
        />

        {stage !== "idle" && (
          <ScrollArea.Root height="85vh" maxW="lg" w="full" mt="3">
            <ScrollArea.Viewport style={{ overflowX: "hidden" }}>
              <ScrollArea.Content mt="15px" textStyle="sm" w="full" pr="2" minW={0}>
                <div>
                  {photoUrl ? (
                    <Image
                      className="images"
                      w="100%"
                      h="200px"
                      objectFit="contain"
                      src={photoUrl}
                      alt={properties?.name || "Selected place"}
                    />
                  ) : null}
                  <Container pr="10px" pl="10px" divideY="2px">
                    <Heading size="4xl" textAlign="center" mb="5px">
                      {properties?.name}
                    </Heading>
                    <Table.Root>
                      <Table.Body>
                        <Table.Row>
                          <Table.Cell color="gray">Location</Table.Cell>
                          <Table.Cell textAlign="end" fontSize="sm">
                            <Text noOfLines={1} title={properties?.place_formatted}>
                              {properties?.place_formatted}
                            </Text>
                          </Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell color="gray">longitude</Table.Cell>
                          <Table.Cell textAlign="end">{coordinates?.lng.toFixed(5)}</Table.Cell>
                        </Table.Row>
                        <Table.Row>
                          <Table.Cell color="gray">latitude</Table.Cell>
                          <Table.Cell textAlign="end">{coordinates?.lat.toFixed(5)}</Table.Cell>
                        </Table.Row>
                      </Table.Body>
                    </Table.Root>
                  </Container>
                </div>

                <Box gap={"2"} mt="4" mb="4" px="3">
                  <Text mb="1" color="gray.600">
                    {selectedIso && isPastDate
                      ? "Choose a date to view historical data"
                      : "Choose a date to generate the forecast"}
                  </Text>
                  <MapDatePicker id="forecast-date" selectedDate={date} onChange={setDate} showPopperArrow />

                  {loading && (
                    <HStack mt="3" color="gray.600" justifyContent={"center"} spacing="2">
                      <Spinner size="md" />
                      <Text>Loading data…</Text>
                    </HStack>
                  )}
                  {!!errorMsg && (
                    <Text mt="2" color="red.500">
                      {errorMsg}
                    </Text>
                  )}
                </Box>

                {stage === "place" || !report ? (
                  <Card.Root w="full" maxW="full" overflow="hidden" bg="#f9f9f9">
                    <Card.Body>
                      <Card.Description>{statusLabel}</Card.Description>
                      <Card.Title>
                        {date ? (
                          <HStack>
                            <Spinner size="sm" />
                            <Text>Loading {statusLabel.toLowerCase()}…</Text>
                          </HStack>
                        ) : (
                          "Select a date to see details"
                        )}
                      </Card.Title>
                    </Card.Body>
                  </Card.Root>
                ) : (
                  <Flex gap="3" direction="column" w="full" maxW="full" minW={0}>
                    {/* Snapshot header with status chip */}
                    <Flex align="center" justify="space-between">
                      <Text fontWeight="bold" mb="2" fontSize="lg">
                        {statusLabel} Results
                      </Text>
                      <Badge colorPalette={statusColor}>{isPastDate ? "Historical date" : "Forecast"}</Badge>
                    </Flex>

                    {/* Key stats */}
                    {(() => {
                      const fc = forecastRows[0];
                      if (!fc) return null;
                      const mk = (title, value) => ({ title, value: value ?? "—" });
                      const stats = [
                        mk(isPastDate ? "Year" : "Forecast Year", String(fc.year)),
                        mk("Temp (°C)", fmt(fc["Temperature (°C)"])),
                        mk("Precip (mm/day)", fmt(fc["precip_mm_day"])),
                        mk("Wind (m/s)", fmt(fc["Wind speed (m/s)"])),
                        mk("Pressure (hPa)", fmt(fc["Pressure (hPa)"])),
                      ];
                      const pairs = [];
                      for (let i = 0; i < stats.length; i += 2) pairs.push(stats.slice(i, i + 2));
                      return (
                        <Flex gap={"3"} direction="column" w="full" maxW="full" minW={0}>
                          {pairs.map((pair, idx) => (
                            <Flex key={idx} gap="3" justify="space-between">
                              {pair.map(({ title, value }) => (
                                <Card.Root key={title} w={pair.length === 1 ? "100%" : "50%"} bg="#f9f9f9">
                                  <Card.Body>
                                    <Card.Description>
                                      <Text noOfLines={1} title={title}>
                                        {title}
                                      </Text>
                                    </Card.Description>
                                    <Card.Title>
                                      <Text noOfLines={1} title={String(value)}>
                                        {String(value)}
                                      </Text>
                                    </Card.Title>
                                  </Card.Body>
                                </Card.Root>
                              ))}
                            </Flex>
                          ))}
                        </Flex>
                      );
                    })()}

                    {/* Events */}
                    {report?.events &&
                      (() => {
                        const entries = Object.entries(report.events);
                        const pairs = [];
                        for (let i = 0; i < entries.length; i += 2) {
                          pairs.push(entries.slice(i, i + 2));
                        }
                        return pairs.map((pair, idx) => (
                          <Flex key={idx} gap="3" justify="space-between">
                            {pair.map(([k, v]) => (
                              <Card.Root key={k} w={pair.length === 1 ? "100%" : "50%"} bg="#f9f9f9">
                                <Card.Body>
                                  <Card.Description>{k}</Card.Description>
                                  <Card.Title>{v ? "Yes" : "No"}</Card.Title>
                                </Card.Body>
                              </Card.Root>
                            ))}
                          </Flex>
                        ));
                      })()}

                    {/* Trends — with axis labels fixed */}
                    {tempData.length > 0 && (
                      <MetricChart
                        title="Temperature Trend"
                        data={tempData}
                        color="red.solid"
                        height={260}
                        xLabel="Year"
                        yLabel="Temperature (°C)"
                      />
                    )}
                    {windData.length > 0 && (
                      <MetricChart
                        title="Wind Speed Trend"
                        data={windData}
                        color="blue.solid"
                        height={260}
                        xLabel="Year"
                        yLabel="Wind speed (m/s)"
                      />
                    )}
                    {cloudData.length > 0 && (
                      <MetricChart
                        title="Cloud-top T (°C)"
                        data={cloudData}
                        color="purple.solid"
                        height={260}
                        xLabel="Year"
                        yLabel="Cloud-top T (°C)"
                      />
                    )}
                    {pressureData.length > 0 && (
                      <MetricChart
                        title="Pressure (hPa)"
                        data={pressureData}
                        color="green.solid"
                        height={260}
                        xLabel="Year"
                        yLabel="Pressure (hPa)"
                      />
                    )}

                    {/* Probabilities */}
                    {probabilityData.length > 0 && (
                      <ProbabilityChart
                        title={isPastDate ? "Weather Probabilities (historical)" : "Weather Probabilities"}
                        data={probabilityData}
                        height={260}
                        xLabel="Event"
                        yLabel="Probability (%)"
                      />
                    )}

                    {/* Intensity Heat Map */}
                    {coordinates?.lng != null && coordinates?.lat != null && fcRow && (
                      <Card.Root w="full" maxW="full" overflow="hidden" bg="#f9f9f9">
                        <Card.Body gap="2" px="3" py="3">
                          <Card.Description>
                            {isPastDate ? "Historical Intensity Map" : "Forecast Intensity Map"}
                          </Card.Description>
                          <MiniHeatMap
                            lng={coordinates.lng}
                            lat={coordinates.lat}
                            fc={fcRow}
                            events={report?.events || {}}
                            height={260}
                            isPastDate={isPastDate}
                          />
                        </Card.Body>
                      </Card.Root>
                    )}

                    {/* Download JSON */}
                    <Card.Root w="full" maxW="full" overflow="hidden" bg="#f9f9f9">
                      <Card.Body gap="2" px="3" py="3" justifyContent={"center"}>
                        <DownloadTrigger
                          data={downloadJson}
                          fileName={downloadName}
                          mimeType="application/json"
                        >
                          <Button w="full" variant="subtle">
                            Download JSON
                          </Button>
                        </DownloadTrigger>
                      </Card.Body>
                    </Card.Root>
                  </Flex>
                )}
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Corner />
          </ScrollArea.Root>
        )}
      </div>
    </>
  );
});

export default Map;
