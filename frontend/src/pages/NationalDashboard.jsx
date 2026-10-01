import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin, TrendingUp, IndianRupee, Users, Bell, LogOut,
  Search, Filter, ChevronDown, ChevronRight, Activity,
  ArrowUpRight, ArrowDownRight, Clock, FileText, CheckCircle2,
  AlertTriangle, Landmark, Zap, Eye, XCircle, X
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  stateData, projects, activityFeed,
  getKPITotals, getTop10StatesByArea
} from '../data/dashboardData';

const INDIA_GEOJSON_URL =
  'https://raw.githubusercontent.com/geohacker/india/master/state/india_state.geojson';

// ─── Animated Counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ end, duration = 2000, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime;
    let animationFrame;
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);
  return <span>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
}

// ─── KPI Card (Light Theme) ────────────────────────────────────────────────────
function KPICard({ icon: Icon, title, value, prefix, suffix, color, trend, trendValue, delay }) {
  const colorMap = {
    amber: {
      bg: 'from-orange-50 to-amber-50',
      border: 'border-orange-200',
      icon: 'text-orange-500',
      iconBg: 'bg-orange-100',
      ring: 'ring-orange-100',
      shadow: 'shadow-orange-100',
    },
    emerald: {
      bg: 'from-emerald-50 to-green-50',
      border: 'border-emerald-200',
      icon: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      ring: 'ring-emerald-100',
      shadow: 'shadow-emerald-100',
    },
    blue: {
      bg: 'from-blue-50 to-sky-50',
      border: 'border-blue-200',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100',
      ring: 'ring-blue-100',
      shadow: 'shadow-blue-100',
    },
    purple: {
      bg: 'from-purple-50 to-violet-50',
      border: 'border-purple-200',
      icon: 'text-purple-600',
      iconBg: 'bg-purple-100',
      ring: 'ring-purple-100',
      shadow: 'shadow-purple-100',
    },
  };
  const c = colorMap[color] || colorMap.amber;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} p-6 shadow-md ${c.shadow} ring-1 ${c.ring} cursor-default`}
    >
      <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${c.bg} blur-2xl opacity-60`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${c.iconBg} ${c.icon}`}>
            <Icon size={24} strokeWidth={2} />
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              trend === 'up' ? 'text-emerald-600 bg-emerald-100' : 'text-red-500 bg-red-100'
            }`}>
              {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trendValue}
            </div>
          )}
        </div>
        <div className="text-3xl font-black text-[#1a1a2e] mb-1 tracking-tight">
          <AnimatedCounter end={value} prefix={prefix || ''} suffix={suffix || ''} />
        </div>
        <div className="text-sm text-gray-500 font-medium">{title}</div>
      </div>
    </motion.div>
  );
}

// ─── Progress Bar (Light Theme) ────────────────────────────────────────────────
function ProgressBar({ label, current, total, color, icon: Icon }) {
  const percent = Math.round((current / total) * 100);
  const barColors = {
    emerald: 'from-emerald-500 to-emerald-400',
    amber: 'from-amber-500 to-orange-400',
    blue: 'from-blue-500 to-blue-400',
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-2xl p-6 shadow-md border border-gray-100"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-500'}`}>
            <Icon size={18} />
          </div>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <span className="text-2xl font-black text-[#1a1a2e]">{percent}%</span>
      </div>
      <div className="relative h-4 rounded-full bg-gray-100 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1.5, delay: 0.5, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${barColors[color] || barColors.emerald}`}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-400">
        <span>{current.toLocaleString('en-IN')} achieved</span>
        <span>{total.toLocaleString('en-IN')} total</span>
      </div>
    </motion.div>
  );
}

// ─── Activity Item (Light Theme) ───────────────────────────────────────────────
function ActivityItem({ item, index }) {
  const typeIcons = {
    milestone: <CheckCircle2 size={14} className="text-emerald-500" />,
    payment: <IndianRupee size={14} className="text-orange-500" />,
    proposal: <FileText size={14} className="text-blue-500" />,
    completed: <CheckCircle2 size={14} className="text-emerald-500" />,
    document: <FileText size={14} className="text-purple-500" />,
    hearing: <Users size={14} className="text-cyan-500" />,
    alert: <AlertTriangle size={14} className="text-red-500" />,
    approval: <CheckCircle2 size={14} className="text-emerald-500" />,
    legal: <Landmark size={14} className="text-orange-500" />,
  };
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex gap-3 p-3 rounded-xl hover:bg-orange-50 transition-colors cursor-default group"
    >
      <div className="mt-1 flex-shrink-0">
        {typeIcons[item.type] || <Activity size={14} className="text-gray-400" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-orange-500 mb-0.5">{item.state}</div>
        <div className="text-sm text-gray-600 group-hover:text-gray-800 transition-colors leading-snug">
          {item.message}
        </div>
        <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400">
          <Clock size={10} />
          {item.timestamp}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    Ongoing: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
    Completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    Delayed: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  };
  const c = cfg[status] || cfg.Ongoing;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} ${status === 'Ongoing' ? 'animate-pulse' : ''}`} />
      {status}
    </span>
  );
}

// ─── Custom Bar Chart Tooltip (Light) ──────────────────────────────────────────
function CustomBarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-xl p-3 shadow-xl border border-gray-200">
      <div className="text-sm font-bold text-[#1a1a2e] mb-1">{d.name}</div>
      <div className="text-xs text-emerald-600">Acquired: {d.acquired.toLocaleString('en-IN')} acres</div>
      <div className="text-xs text-gray-500">Notified: {d.notified.toLocaleString('en-IN')} acres</div>
    </div>
  );
}

// ─── India Map Component ───────────────────────────────────────────────────────
function IndiaMap({ onStateClick, selectedState }) {
  const [geoData, setGeoData] = useState(null);
  const [hoveredState, setHoveredState] = useState(null);
  const geoJsonRef = useRef(null);

  useEffect(() => {
    fetch(INDIA_GEOJSON_URL)
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load GeoJSON:', err));
  }, []);

  const nameMap = {
    "Maharashtra": "Maharashtra", "Uttar Pradesh": "Uttar Pradesh",
    "Rajasthan": "Rajasthan", "Tamil Nadu": "Tamil Nadu",
    "Gujarat": "Gujarat", "Karnataka": "Karnataka",
    "Madhya Pradesh": "Madhya Pradesh", "West Bengal": "West Bengal",
    "Telangana": "Telangana", "Andhra Pradesh": "Andhra Pradesh",
    "Kerala": "Kerala", "Punjab": "Punjab", "Odisha": "Odisha",
    "Orissa": "Odisha", "Bihar": "Bihar", "Jharkhand": "Jharkhand",
    "Chhattisgarh": "Chhattisgarh", "Chattisgarh": "Chhattisgarh",
    "Haryana": "Haryana", "Assam": "Assam", "Uttarakhand": "Uttarakhand",
    "Uttaranchal": "Uttarakhand", "Himachal Pradesh": "Himachal Pradesh", "Goa": "Goa",
  };

  function getProgressColor(progress) {
    if (progress >= 85) return '#10b981';
    if (progress >= 70) return '#22c55e';
    if (progress >= 60) return '#84cc16';
    if (progress >= 50) return '#eab308';
    if (progress >= 40) return '#f97316';
    return '#ef4444';
  }

  function style(feature) {
    const name = feature.properties.NAME_1 || feature.properties.name || feature.properties.ST_NM || '';
    const mappedName = nameMap[name] || name;
    const data = stateData[mappedName];
    const progress = data?.progressPercent || 30;
    const isSelected = selectedState === mappedName;
    const isHovered = hoveredState === mappedName;
    return {
      fillColor: getProgressColor(progress),
      weight: isSelected ? 3 : isHovered ? 2 : 1,
      opacity: 1,
      color: isSelected ? '#FF9933' : isHovered ? '#003580' : 'rgba(255,255,255,0.4)',
      fillOpacity: isSelected ? 0.9 : isHovered ? 0.8 : 0.65,
    };
  }

  function onEachFeature(feature, layer) {
    const name = feature.properties.NAME_1 || feature.properties.name || feature.properties.ST_NM || '';
    const mappedName = nameMap[name] || name;
    const data = stateData[mappedName];
    if (data) {
      layer.bindTooltip(
        `<div style="font-family:Inter,sans-serif;padding:4px 0">
          <div style="font-weight:800;font-size:14px;margin-bottom:4px;color:#1a1a2e">${mappedName}</div>
          <div style="font-size:11px;color:#6b7280">Area Acquired: <span style="color:#10b981;font-weight:700">${data.totalAcquired.toLocaleString('en-IN')}</span> / ${data.totalNotified.toLocaleString('en-IN')} acres</div>
          <div style="font-size:11px;color:#6b7280">Compensation: <span style="color:#f59e0b;font-weight:700">₹${data.compensationDisbursed.toLocaleString('en-IN')}</span> Cr</div>
          <div style="font-size:11px;color:#6b7280">Families: <span style="color:#7c3aed;font-weight:700">${data.familiesAffected.toLocaleString('en-IN')}</span></div>
          <div style="font-size:11px;color:#6b7280">Progress: <span style="color:#10b981;font-weight:700">${data.progressPercent}%</span></div>
        </div>`,
        { direction: 'top', className: 'custom-tooltip', opacity: 1 }
      );
    }
    layer.on({
      mouseover: (e) => {
        setHoveredState(mappedName);
        e.target.setStyle({ weight: 2, color: '#003580', fillOpacity: 0.8 });
      },
      mouseout: (e) => {
        setHoveredState(null);
        if (geoJsonRef.current) geoJsonRef.current.resetStyle(e.target);
      },
      click: () => { onStateClick(mappedName === selectedState ? null : mappedName); },
    });
  }

  if (!geoData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading India map...</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={[22.5, 82.5]} zoom={4.5} scrollWheelZoom={false}
      dragging={true} zoomControl={false} attributionControl={false}
      style={{ height: '100%', width: '100%', background: 'transparent', borderRadius: '1rem' }}
      className="rounded-2xl"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        opacity={0.4}
      />
      <GeoJSON ref={geoJsonRef} data={geoData} style={style} onEachFeature={onEachFeature} />
    </MapContainer>
  );
}

// ─── Plot Search Map Component ──────────────────────────────────────────────────
function PlotSearchMap() {
  const [geoData, setGeoData] = useState(null);
  const [searchPlot, setSearchPlot] = useState('');
  const [searchedData, setSearchedData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/parcels')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("Error fetching map data:", err));
  }, []);

  const handleSearch = async () => {
    if (!searchPlot) return;
    setError(null);
    setSearchedData(null);
    try {
      const res = await fetch(`http://localhost:3000/api/parcels/search?plot_number=${searchPlot}`);
      if (!res.ok) throw new Error('Plot not found');
      const data = await res.json();
      setSearchedData(data);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-orange-100 shadow-md mt-8 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-[#1a1a2e] flex items-center gap-2">
          <Search size={24} className="text-orange-500" />
          Plot Search & Valuation
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter Plot No. (e.g., PN-1005)"
            value={searchPlot}
            onChange={(e) => setSearchPlot(e.target.value)}
            className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-[#1a1a2e] focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100 placeholder-gray-400 text-sm"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-[#FF9933] to-orange-500 hover:from-orange-400 hover:to-orange-400 transition-all shadow-md"
          >
            Search
          </button>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm font-bold mb-4 bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 h-96 rounded-xl overflow-hidden border border-gray-200 relative">
          <MapContainer
            center={[21.1458, 79.0882]} zoom={14} scrollWheelZoom={true}
            dragging={true} zoomControl={true} attributionControl={false}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            {geoData && (
              <GeoJSON
                data={geoData}
                style={(feature) => ({
                  color: feature.properties.owner_color || '#FF9933',
                  weight: 2,
                  fillColor: feature.properties.owner_color || '#FF9933',
                  fillOpacity: 0.5
                })}
                onEachFeature={(feature, layer) => {
                  layer.bindPopup(`
                    <div style="font-family: sans-serif; color: #1a1a2e;">
                      <strong>${feature.properties.plot_number}</strong><br/>
                      Owner: ${feature.properties.owner_name}<br/>
                      Phone: ${feature.properties.owner_phone}<br/>
                      Area: ${feature.properties.parcel_area} acres
                    </div>
                  `);
                }}
              />
            )}
          </MapContainer>
        </div>

        <div className="lg:col-span-1 space-y-4 overflow-y-auto max-h-[24rem]">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 min-h-full">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4">Plot Details</h3>
            {searchedData ? (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase mb-0.5">Plot Number</div>
                  <div className="text-lg font-black text-orange-500">{searchedData.plot_number}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase mb-0.5">Coordinates</div>
                  <div className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">
                    {searchedData.latitude.toFixed(6)}, {searchedData.longitude.toFixed(6)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase mb-0.5">Owner Name</div>
                  <div className="text-sm font-bold text-[#1a1a2e]">{searchedData.owner_name}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase mb-0.5">Contact</div>
                  <div className="text-xs text-gray-700">{searchedData.owner_phone}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase mb-0.5">Aadhaar (Masked)</div>
                  <div className="text-xs font-mono text-gray-700">{searchedData.owner_aadhaar}</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 uppercase mb-0.5">Address</div>
                  <div className="text-xs text-gray-600 leading-tight">{searchedData.owner_address}</div>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-[10px] text-gray-400 uppercase mb-0.5">Current Valuation</div>
                  <div className="text-base font-black text-emerald-600">₹{searchedData.valuation.toLocaleString('en-IN')}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase mb-0.5">Land Usage</div>
                    <div className="text-xs font-bold text-[#1a1a2e]">{searchedData.usage}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase mb-0.5">Area</div>
                    <div className="text-xs font-bold text-[#1a1a2e]">{searchedData.parcel_area} acres</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-sm flex h-4/5 items-center justify-center text-center mt-10">
                Search for a plot number to view complete ownership details and valuation.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function NationalDashboard() {
  const navigate = useNavigate();
  const [selectedState, setSelectedState] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const kpi = useMemo(() => getKPITotals(), []);
  const top10 = useMemo(() => getTop10StatesByArea(), []);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchState = selectedState ? p.state === selectedState : true;
      const matchStatus = statusFilter === 'All' ? true : p.status === statusFilter;
      const matchSearch = searchTerm
        ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.state.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.purpose.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      return matchState && matchStatus && matchSearch;
    });
  }, [selectedState, statusFilter, searchTerm]);

  const barColors = [
    '#FF9933', '#FFB347', '#E07800', '#F59E0B',
    '#22C55E', '#138808', '#10B981', '#059669',
    '#3B82F6', '#003580'
  ];

  return (
    <div className="min-h-screen bg-[#FFF8F0] relative overflow-hidden">
      {/* Subtle ambient glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-green-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Tiranga stripe */}
      <div className="h-1.5 tiranga-bar" />

      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-orange-100 shadow-sm"
        style={{ background: 'rgba(255,248,240,0.96)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'linear-gradient(135deg, #FF9933, #FFFFFF, #138808)' }}
              >
                <span className="text-gray-800 font-black text-xs">🇮🇳</span>
              </motion.div>
              <div>
                <div className="text-[#003580] font-black text-base leading-tight">NLAMS</div>
                <div className="text-[9px] text-[#138808] font-bold tracking-widest uppercase">Govt. of India</div>
              </div>
            </Link>
            <div className="hidden xl:block h-7 w-px bg-gray-300 mx-1" />
            <span className="hidden xl:inline text-gray-700 font-bold text-sm tracking-wide">
              Central Ministry Portal
            </span>
          </div>

          {/* Nav Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-orange-50 border border-orange-200 shadow-inner">
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-md flex items-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #FF9933, #E07800)' }}
            >
              <span>🏛️</span>
              <span className="hidden md:inline">National View</span>
            </span>
            <Link to="/state-dashboard" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-[#FF9933] hover:bg-white transition-all flex items-center gap-1.5">
              <span>🗳️</span><span className="hidden md:inline">State (MH)</span>
            </Link>
            <Link to="/district-dashboard" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-[#FF9933] hover:bg-white transition-all flex items-center gap-1.5">
              <span>📋</span><span className="hidden md:inline">District (Pune)</span>
            </Link>
            <Link to="/farmer-dashboard" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-[#FF9933] hover:bg-white transition-all flex items-center gap-1.5">
              <span>🌾</span><span className="hidden md:inline">Farmer Portal</span>
            </Link>
            <Link to="/" className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#FF9933] hover:bg-white transition-all flex items-center gap-1" title="Return to Home">
              <span>🏠</span>
            </Link>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2.5 mr-1">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shadow-sm"
                style={{ background: 'linear-gradient(135deg, #003580, #0033A0)' }}>
                RK
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[#1a1a2e]">Rajesh Kumar, IAS</div>
                <div className="text-[10px] text-gray-400">Joint Secretary · MoRD</div>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              className="relative p-2 rounded-xl text-gray-500 hover:text-[#FF9933] hover:bg-orange-50 transition-all">
              <Bell size={17} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse bg-[#FF9933]" />
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 border border-gray-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all">
              <LogOut size={13} />
              <span className="hidden sm:inline">Logout</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ─── Main Content ─────────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">

        {/* State filter indicator */}
        <AnimatePresence>
          {selectedState && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-orange-50 border border-orange-200"
            >
              <MapPin size={16} className="text-orange-500" />
              <span className="text-sm text-gray-700">
                Filtering by: <span className="font-bold text-orange-500">{selectedState}</span>
              </span>
              <button onClick={() => setSelectedState(null)} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors">
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPICard icon={MapPin} title="Total Area Notified" value={kpi.totalNotified} suffix=" acres" color="amber" trend="up" trendValue="+12.4%" delay={0} />
          <KPICard icon={TrendingUp} title="Total Area Acquired" value={kpi.totalAcquired} suffix=" acres" color="emerald" trend="up" trendValue="+8.7%" delay={0.1} />
          <KPICard icon={IndianRupee} title="Compensation Disbursed" value={kpi.compensationDisbursed} prefix="₹" suffix=" Cr" color="blue" trend="up" trendValue="+15.2%" delay={0.2} />
          <KPICard icon={Users} title="Families Affected" value={kpi.familiesAffected} suffix=" families" color="purple" trend="down" trendValue="-3.1%" delay={0.3} />
        </div>

        {/* Plot Search Map */}
        <PlotSearchMap />

        {/* Map + Activity Feed */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* India Map */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="xl:col-span-2 bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100"
          >
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                    <MapPin size={18} className="text-emerald-500" />
                    Land Acquisition Progress — India
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">Click a state to filter projects below</p>
                </div>
                <div className="hidden md:flex items-center gap-4 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" />High (&gt;85%)</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-yellow-500" />Medium</div>
                  <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" />Low (&lt;50%)</div>
                </div>
              </div>
            </div>
            <div className="h-[500px] relative">
              <IndiaMap onStateClick={setSelectedState} selectedState={selectedState} />
            </div>
          </motion.div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="bg-white rounded-2xl flex flex-col shadow-md border border-gray-100"
          >
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                <Activity size={18} className="text-orange-500" />
                Live Activity Feed
              </h2>
              <p className="text-xs text-gray-400 mt-1">Real-time updates across India</p>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1 max-h-[460px]">
              {activityFeed.map((item, i) => (
                <ActivityItem key={item.id} item={item} index={i} />
              ))}
            </div>
            <div className="p-3 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                Live — Updates every 30 seconds
              </div>
            </div>
          </motion.div>
        </div>

        {/* Progress Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProgressBar label="Area Notified vs Area Acquired" current={kpi.totalAcquired} total={kpi.totalNotified} color="emerald" icon={TrendingUp} />
          <ProgressBar label="Compensation Sanctioned vs Disbursed" current={kpi.compensationDisbursed} total={kpi.compensationSanctioned} color="amber" icon={IndianRupee} />
        </div>

        {/* Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-2xl p-6 shadow-md border border-gray-100"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Top 10 States by Acquisition Area
              </h2>
              <p className="text-xs text-gray-400 mt-1">Land area acquired in acres</p>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top10} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis type="number" stroke="rgba(0,0,0,0.15)"
                  tick={{ fill: '#9ca3af', fontSize: 11 }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <YAxis type="category" dataKey="name" width={130} stroke="rgba(0,0,0,0.15)"
                  tick={{ fill: '#374151', fontSize: 12, fontWeight: 600 }} />
                <RechartsTooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(255,153,51,0.05)' }} />
                <Bar dataKey="acquired" radius={[0, 8, 8, 0]} barSize={24}>
                  {top10.map((_, i) => <Cell key={i} fill={barColors[i]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Projects Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100"
        >
          <div className="p-5 border-b border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                  <FileText size={18} className="text-blue-500" />
                  All Projects
                  <span className="text-xs font-normal text-gray-400 ml-2">
                    ({filteredProjects.length} of {projects.length})
                  </span>
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text" placeholder="Search projects..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="w-60 pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                  />
                </div>
                <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200">
                  {['All', 'Ongoing', 'Completed', 'Delayed'].map(status => (
                    <button key={status} onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        statusFilter === status
                          ? 'bg-white text-[#FF9933] shadow-sm border border-orange-100'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}>
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Project Name</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">State</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Purpose</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Area (acres)</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Families</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Compensation</th>
                  <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filteredProjects.map((project, i) => (
                    <motion.tr key={project.id}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }} transition={{ delay: i * 0.03 }}
                      className="hover:bg-orange-50/50 cursor-pointer transition-colors group"
                    >
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-gray-800 group-hover:text-[#FF9933] transition-colors">
                          {project.name}
                        </span>
                      </td>
                      <td className="px-5 py-4"><span className="text-sm text-gray-600">{project.state}</span></td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{project.purpose}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-mono font-bold text-gray-700">{project.area.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-5 py-4"><StatusBadge status={project.status} /></td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-mono text-gray-600">{project.familiesAffected.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-mono text-orange-500 font-bold">₹{project.compensationCr} Cr</span>
                      </td>
                      <td className="px-5 py-4"><span className="text-xs text-gray-400">{project.lastUpdated}</span></td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredProjects.length === 0 && (
            <div className="py-16 text-center">
              <Search size={40} className="text-gray-200 mx-auto mb-4" />
              <p className="text-gray-400 text-sm">No projects match your filters</p>
              <button onClick={() => { setSearchTerm(''); setStatusFilter('All'); setSelectedState(null); }}
                className="mt-3 text-xs text-[#FF9933] hover:text-orange-600 underline underline-offset-4">
                Clear all filters
              </button>
            </div>
          )}

          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Showing {filteredProjects.length} of {projects.length} projects</span>
            <span className="flex items-center gap-1">
              <Zap size={12} className="text-emerald-500" />
              Data refreshed at {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </motion.div>

      </main>

      {/* Leaflet tooltip styles */}
      <style>{`
        .custom-tooltip {
          background: rgba(255,255,255,0.98) !important;
          border: 1px solid rgba(255,153,51,0.3) !important;
          border-radius: 12px !important;
          padding: 12px 16px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
          color: #1a1a2e !important;
          backdrop-filter: blur(12px) !important;
        }
        .custom-tooltip::before {
          border-top-color: rgba(255,255,255,0.98) !important;
        }
        .leaflet-container {
          background: transparent !important;
        }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
    </div>
  );
}
