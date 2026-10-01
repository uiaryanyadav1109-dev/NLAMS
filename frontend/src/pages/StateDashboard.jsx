import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Bell, LogOut, TrendingUp, IndianRupee, Users, Landmark,
  FileText, CheckCircle2, Clock, AlertTriangle, Activity, Search,
  ChevronDown, ArrowUpRight, ArrowDownRight, Zap, XCircle, X,
  ThumbsUp, ThumbsDown, Shield, Send, Eye, CircleDot, Loader2,
  BarChart3, FolderOpen
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell, Legend
} from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Popup, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  stateProfile, stateKPI, districtData, pendingProposals,
  ongoingProjects, delayedAlerts, stateActivityFeed,
  getDistrictCompensationChart
} from '../data/stateData';

// Maharashtra GeoJSON
const MH_GEOJSON_URL =
  'https://raw.githubusercontent.com/geohacker/india/master/district/maharashtra.geojson';

// ─── Animated Counter ──────────────────────────────────────────────────────────
function AnimatedCounter({ end, duration = 1800, prefix = '', suffix = '' }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start;
    let raf;
    const tick = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return <span>{prefix}{count.toLocaleString('en-IN')}{suffix}</span>;
}

// ─── KPI Card (Light Theme) ────────────────────────────────────────────────────
function KPICard({ icon: Icon, title, value, prefix, suffix, color, trend, delay }) {
  const cm = {
    amber:   { bg: 'from-orange-50 to-amber-50',   border: 'border-orange-200',  icon: 'text-orange-500',  iconBg: 'bg-orange-100',  ring: 'ring-orange-100' },
    emerald: { bg: 'from-emerald-50 to-green-50',  border: 'border-emerald-200', icon: 'text-emerald-600', iconBg: 'bg-emerald-100', ring: 'ring-emerald-100' },
    blue:    { bg: 'from-blue-50 to-sky-50',        border: 'border-blue-200',    icon: 'text-blue-600',    iconBg: 'bg-blue-100',    ring: 'ring-blue-100' },
    red:     { bg: 'from-red-50 to-rose-50',        border: 'border-red-200',     icon: 'text-red-500',     iconBg: 'bg-red-100',     ring: 'ring-red-100' },
    purple:  { bg: 'from-purple-50 to-violet-50',  border: 'border-purple-200',  icon: 'text-purple-600',  iconBg: 'bg-purple-100',  ring: 'ring-purple-100' },
  };
  const c = cm[color] || cm.amber;
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} p-6 shadow-md ring-1 ${c.ring} cursor-default`}
    >
      <div className={`absolute -top-8 -right-8 w-28 h-28 rounded-full bg-gradient-to-br ${c.bg} blur-2xl opacity-60`} />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${c.iconBg} ${c.icon}`}><Icon size={24} strokeWidth={2} /></div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
              trend.dir === 'up' ? 'text-emerald-600 bg-emerald-100' : 'text-orange-500 bg-orange-100'
            }`}>
              {trend.dir === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {trend.val}
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

// ─── Stage Badge ──────────────────────────────────────────────────────────────
function StageBadge({ stage }) {
  const cfg = {
    Notification: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-200' },
    Award:        { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    Compensation: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
    Possession:   { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    'R&R':        { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  };
  const c = cfg[stage] || cfg.Notification;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
      <CircleDot size={10} />
      {stage}
    </span>
  );
}

// ─── Priority Badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const c = priority === 'high'
    ? 'bg-red-100 text-red-600 border-red-200'
    : 'bg-amber-100 text-amber-700 border-amber-200';
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${c}`}>
      {priority}
    </span>
  );
}

// ─── Activity Icon ────────────────────────────────────────────────────────────
const actTypeIcons = {
  proposal:  <FileText size={14} className="text-blue-500" />,
  milestone: <CheckCircle2 size={14} className="text-emerald-500" />,
  approval:  <ThumbsUp size={14} className="text-emerald-500" />,
  document:  <FileText size={14} className="text-purple-500" />,
  payment:   <IndianRupee size={14} className="text-orange-500" />,
  legal:     <Landmark size={14} className="text-amber-500" />,
  hearing:   <Users size={14} className="text-cyan-500" />,
  alert:     <AlertTriangle size={14} className="text-red-500" />,
};

// ─── Custom Recharts Tooltip ──────────────────────────────────────────────────
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white rounded-xl p-3 shadow-xl border border-gray-200 text-xs">
      <div className="font-bold text-[#1a1a2e] mb-1">{d.name}</div>
      <div className="text-emerald-600">Sanctioned: ₹{d.sanctioned} Cr</div>
      <div className="text-orange-500">Disbursed: ₹{d.disbursed} Cr</div>
      <div className="text-gray-500 mt-1">
        Gap: ₹{d.sanctioned - d.disbursed} Cr ({Math.round((d.disbursed / d.sanctioned) * 100)}% paid)
      </div>
    </div>
  );
}

// ─── State Map ────────────────────────────────────────────────────────────────
function StateMap({ currentState, getDynamicDistrict }) {
  const [geoData, setGeoData] = useState(null);
  const geoRef = useRef(null);

  useEffect(() => {
    const formattedStateName = currentState.toLowerCase().replace(' ', '_');
    fetch(`https://raw.githubusercontent.com/geohacker/india/master/district/${formattedStateName}.geojson`)
      .then(r => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setGeoData)
      .catch(() => {
        fetch(MH_GEOJSON_URL).then(r => r.json()).then(setGeoData).catch(() => {});
      });
  }, [currentState]);

  const districtActivityColor = (name) => {
    const d = Object.values(districtData).find(v => getDynamicDistrict(Object.keys(districtData).find(k => districtData[k] === v)) === name);
    if (!d) return name.length % 2 === 0 ? '#10b981' : '#f59e0b';
    if (d.activity === 'high') return '#10b981';
    if (d.activity === 'medium') return '#f59e0b';
    return '#94a3b8';
  };

  const geoStyle = (feature) => {
    const name = feature.properties.NAME_2 || feature.properties.district || feature.properties.DISTRICT || '';
    return {
      fillColor: districtActivityColor(name),
      weight: 1,
      color: 'rgba(255,255,255,0.7)',
      fillOpacity: 0.65,
    };
  };

  const onEachFeature = (feature, layer) => {
    const name = feature.properties.NAME_2 || feature.properties.district || feature.properties.DISTRICT || '';
    const d = Object.values(districtData).find(v => getDynamicDistrict(Object.keys(districtData).find(k => districtData[k] === v)) === name) || {
      projects: name.length % 3 + 1,
      area: name.length * 100,
      families: name.length * 50
    };
    
    layer.bindTooltip(
      `<div style="font-family:Inter,sans-serif; color: #1a1a2e">
        <div style="font-weight:800;font-size:13px;margin-bottom:3px">${name}</div>
        <div style="font-size:11px;color:#4b5563">Projects: <b style="color:#10b981">${d.projects}</b></div>
        <div style="font-size:11px;color:#4b5563">Area: <b style="color:#f59e0b">${d.area.toLocaleString('en-IN')}</b> acres</div>
        <div style="font-size:11px;color:#4b5563">Families: <b style="color:#7c3aed">${d.families}</b></div>
      </div>`,
      { className: 'state-tooltip', direction: 'top', opacity: 1 }
    );
    
    layer.on({
      mouseover: (e) => e.target.setStyle({ weight: 2, color: '#003580', fillOpacity: 0.85 }),
      mouseout: (e) => { if (geoRef.current) geoRef.current.resetStyle(e.target); },
    });
  };

  return (
    <div className="h-full min-h-[400px] rounded-xl overflow-hidden">
      <MapContainer
        key={currentState}
        center={currentState === 'Maharashtra' ? [19.5, 76.0] : [22.0, 80.0]}
        zoom={currentState === 'Maharashtra' ? 6.2 : 5}
        scrollWheelZoom={false}
        dragging={true}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: 'transparent' }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png" opacity={0.4} />
        {geoData && <GeoJSON ref={geoRef} data={geoData} style={geoStyle} onEachFeature={onEachFeature} />}
        {ongoingProjects.map(p => (
          <CircleMarker
            key={p.id}
            center={p.coordinates}
            radius={p.delayed ? 8 : 6}
            pathOptions={{
              color: p.delayed ? '#ef4444' : '#10b981',
              fillColor: p.delayed ? '#ef4444' : '#10b981',
              fillOpacity: 0.8,
              weight: p.delayed ? 2 : 1,
            }}
          >
            <Popup>
              <div style={{ fontFamily: 'Inter, sans-serif', color: '#1a1a2e' }}>
                <strong>{p.name}</strong><br />
                <span style={{ color: '#4b5563', fontSize: '11px' }}>{p.district} · {p.stage}</span><br />
                {p.delayed && <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 700 }}>⚠ Delayed by {p.delayDays} days</span>}
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

// ─── Approve / Reject Modal ──────────────────────────────────────────────────
function ActionModal({ type, proposal, onClose, onConfirm }) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setDone(true);
    setTimeout(() => { onConfirm(); onClose(); }, 800);
  };

  const isApprove = type === 'approve';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-2xl border border-gray-200 w-full max-w-md p-6 shadow-2xl"
      >
        {done ? (
          <div className="text-center py-4">
            <CheckCircle2 size={48} className={`mx-auto mb-3 ${isApprove ? 'text-emerald-500' : 'text-red-500'}`} />
            <div className="text-lg font-bold text-[#1a1a2e]">
              {isApprove ? 'Proposal Approved!' : 'Proposal Returned'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {isApprove ? 'Forwarded to Central Ministry' : 'Sent back to district with remarks'}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isApprove ? 'bg-emerald-100' : 'bg-red-100'
              }`}>
                {isApprove ? <ThumbsUp size={20} className="text-emerald-600" /> : <ThumbsDown size={20} className="text-red-600" />}
              </div>
              <div>
                <div className="text-[#1a1a2e] font-bold">{isApprove ? 'Approve Proposal' : 'Reject Proposal'}</div>
                <div className="text-xs text-gray-400">{proposal.id}</div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 mb-4">
              <div className="text-sm font-semibold text-gray-800">{proposal.name}</div>
              <div className="text-xs text-gray-500 mt-1">{proposal.district} · {proposal.area} acres · ₹{proposal.compensationEst} Cr est.</div>
            </div>

            {isApprove ? (
              <p className="text-sm text-gray-600 mb-5">
                This will <span className="text-emerald-600 font-semibold">sign and approve</span> the proposal and forward it to the Central Ministry for final clearance.
              </p>
            ) : (
              <div className="mb-5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Reason for Rejection *</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  rows={3}
                  placeholder="Provide a reason (will be sent to the district)..."
                  className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="flex-1 py-3 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all font-semibold">
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleConfirm}
                disabled={loading || (!isApprove && !reason.trim())}
                className={`flex-[2] py-3 rounded-xl text-sm font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 ${
                  isApprove
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-md shadow-emerald-200'
                    : 'bg-gradient-to-r from-red-500 to-red-600 shadow-md shadow-red-200'
                }`}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : isApprove ? <ThumbsUp size={16} /> : <Send size={16} />}
                {loading ? 'Processing...' : isApprove ? 'Sign & Approve' : 'Return to District'}
              </motion.button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function StateDashboard() {
  const navigate = useNavigate();
  const [currentState, setCurrentState] = useState('Maharashtra');
  const [proposals, setProposals] = useState(pendingProposals);
  const [modal, setModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState('All');

  const chartData = useMemo(() => getDistrictCompensationChart(), []);
  const kpi = stateKPI;
  const profile = stateProfile;

  const getDynamicDistrict = (originalDistrict) => {
    if (currentState === 'Maharashtra') return originalDistrict;
    const map = {
      'West Bengal': { 'Pune': 'Kolkata', 'Nashik': 'Howrah', 'Nagpur': 'Darjeeling', 'Mumbai': 'Siliguri', 'Thane': 'Asansol', 'Solapur': 'Durgapur', 'Kolhapur': 'Kharagpur', 'Satara': 'Haldia' },
      'Gujarat': { 'Pune': 'Ahmedabad', 'Nashik': 'Surat', 'Nagpur': 'Vadodara', 'Mumbai': 'Rajkot', 'Thane': 'Gandhinagar', 'Solapur': 'Bhavnagar', 'Kolhapur': 'Jamnagar', 'Satara': 'Junagadh' },
      'Karnataka': { 'Pune': 'Bengaluru', 'Nashik': 'Mysuru', 'Nagpur': 'Hubli', 'Mumbai': 'Mangaluru', 'Thane': 'Belagavi', 'Solapur': 'Ballari', 'Kolhapur': 'Dharwad', 'Satara': 'Vijayapura' },
      'Uttar Pradesh': { 'Pune': 'Lucknow', 'Nashik': 'Kanpur', 'Nagpur': 'Varanasi', 'Mumbai': 'Agra', 'Thane': 'Noida', 'Solapur': 'Meerut', 'Kolhapur': 'Prayagraj', 'Satara': 'Ghaziabad' }
    };
    return map[currentState]?.[originalDistrict] || `${originalDistrict} Region`;
  };

  const getDynamicName = (name) => {
    if (currentState === 'Maharashtra') return name;
    let newName = name;
    ['Pune', 'Nashik', 'Nagpur', 'Mumbai', 'Thane', 'Solapur', 'Kolhapur', 'Satara', 'Maharashtra'].forEach(d => {
      newName = newName.replace(d, d === 'Maharashtra' ? currentState : getDynamicDistrict(d));
    });
    return newName;
  };

  const dynamicProposals = useMemo(() => {
    return proposals.map(p => ({
      ...p,
      district: getDynamicDistrict(p.district),
      name: getDynamicName(p.name)
    }));
  }, [proposals, currentState]);

  const filteredProjects = useMemo(() => {
    return ongoingProjects.map(p => ({
      ...p,
      district: getDynamicDistrict(p.district),
      name: getDynamicName(p.name)
    })).filter(p => {
      const matchStage = stageFilter === 'All' || p.stage === stageFilter;
      const matchSearch = !searchTerm ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.district.toLowerCase().includes(searchTerm.toLowerCase());
      return matchStage && matchSearch;
    });
  }, [stageFilter, searchTerm, currentState]);

  const handleProposalAction = (proposalId) => {
    setProposals(prev => prev.filter(p => p.id !== proposalId));
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-green-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Tiranga accent — top */}
      <div className="h-1.5 tiranga-bar" />

      {/* ─── Top Bar ──────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-orange-100 shadow-sm"
        style={{ background: 'rgba(255,248,240,0.96)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Left */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md"
                style={{ background: 'linear-gradient(135deg, #FF9933, #FFFFFF, #138808)' }}
              >
                <span className="text-sm">🇮🇳</span>
              </motion.div>
              <div>
                <div className="text-[#003580] font-black text-base leading-tight">NLAMS</div>
                <div className="text-[9px] text-[#138808] font-bold tracking-widest uppercase">Govt. of India</div>
              </div>
            </Link>

            <div className="hidden xl:block h-7 w-px bg-gray-300 mx-1" />

            {/* State identity with Dropdown */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shadow-md"
                style={{ background: 'linear-gradient(135deg, #138808, #0a5c04)' }}>
                {profile.emblem}
              </div>
              <div className="flex flex-col">
                <select
                  value={currentState}
                  onChange={(e) => setCurrentState(e.target.value)}
                  className="bg-transparent text-xs font-bold text-[#1a1a2e] leading-tight focus:outline-none cursor-pointer hover:text-[#FF9933] transition-colors appearance-none"
                  style={{ backgroundImage: 'none' }}
                >
                  {[
                    "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh",
                    "Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka",
                    "Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram",
                    "Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu",
                    "Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal"
                  ].map(state => (
                    <option key={state} value={state} className="bg-white text-[#1a1a2e]">
                      {state} Government
                    </option>
                  ))}
                </select>
                <div className="text-[10px] text-gray-400">Revenue Dept</div>
              </div>
            </div>
          </div>

          {/* Center — Persona Quick Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-orange-50 border border-orange-200 shadow-inner">
            <Link to="/dashboard" className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-[#FF9933] hover:bg-white transition-all flex items-center gap-1.5">
              <span>🏛️</span><span className="hidden md:inline">National View</span>
            </Link>
            <span className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-md flex items-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #138808, #0a5c04)' }}>
              <span>🗳️</span><span className="hidden md:inline">State (MH)</span>
            </span>
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
                style={{ background: 'linear-gradient(135deg, #138808, #0a5c04)' }}>
                SK
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-[#1a1a2e]">{profile.officer.name}</div>
                <div className="text-[10px] text-gray-400">{profile.officer.designation}</div>
              </div>
            </div>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              className="relative p-2 rounded-xl text-gray-500 hover:text-[#FF9933] hover:bg-orange-50 transition-all">
              <Bell size={17} />
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center text-[9px] font-bold text-white rounded-full px-1 bg-[#FF9933]">
                {profile.unreadNotifications}
              </span>
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

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">

        {/* ─── KPI Cards ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPICard icon={FolderOpen} title="Total Projects in State" value={kpi.totalProjects} color="blue" trend={kpi.trends.projects} delay={0} />
          <KPICard icon={MapPin} title="Area Under Acquisition" value={kpi.areaUnderAcquisition} suffix=" acres" color="emerald" trend={kpi.trends.area} delay={0.1} />
          <KPICard icon={IndianRupee} title="Compensation Pending" value={kpi.compensationPending} prefix="₹" suffix=" Cr" color="amber" trend={kpi.trends.compensation} delay={0.2} />
          <KPICard icon={Users} title="Families Displaced" value={kpi.familiesDisplaced} color="red" trend={kpi.trends.families} delay={0.3} />
        </div>

        {/* ─── Pending Proposals ───────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                <FileText size={20} className="text-orange-500" />
                Pending Proposals
                <span className="ml-2 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-600 border border-red-200">
                  {proposals.length} pending your approval
                </span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">Proposals from District Collectors awaiting State Government approval</p>
            </div>
          </div>

          {proposals.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-3" />
              <div className="text-gray-500 text-sm font-semibold">All proposals cleared!</div>
              <div className="text-gray-400 text-xs">No pending approvals at this time.</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Proposal ID', 'Project Name', 'District', 'Purpose', 'Area', 'Families', 'Est. Cost', 'Submitted', 'Priority', 'Actions'].map(h => (
                      <th key={h} className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap bg-gray-50">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dynamicProposals.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="hover:bg-orange-50/50 transition-colors"
                    >
                      <td className="px-5 py-4 text-xs font-mono text-gray-500">{p.id}</td>
                      <td className="px-5 py-4">
                        <div className="text-sm font-semibold text-gray-800">{p.name}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{p.documents} documents attached</div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{p.district}</td>
                      <td className="px-5 py-4"><span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{p.purpose}</span></td>
                      <td className="px-5 py-4 text-sm font-mono text-gray-700">{p.area.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-sm font-mono text-gray-600">{p.families}</td>
                      <td className="px-5 py-4 text-sm font-mono text-orange-500 font-bold">₹{p.compensationEst} Cr</td>
                      <td className="px-5 py-4 text-xs text-gray-400 font-mono">{p.submittedDate}</td>
                      <td className="px-5 py-4"><PriorityBadge priority={p.priority} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setModal({ type: 'approve', proposal: p })}
                            className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 transition-all"
                            title="Approve"
                          >
                            <ThumbsUp size={15} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setModal({ type: 'reject', proposal: p })}
                            className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition-all"
                            title="Reject"
                          >
                            <ThumbsDown size={15} />
                          </motion.button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        {/* ─── Map + Delayed Alerts + Activity Feed ───────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* State Map */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="xl:col-span-2 bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <div className="p-5 border-b border-gray-100">
              <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                <MapPin size={18} className="text-emerald-500" />
                {currentState} — District Acquisition Map
              </h2>
              <p className="text-xs text-gray-400 mt-1">Districts colored by activity · Project pins shown on map</p>
            </div>
            <div className="h-[450px]">
              <StateMap currentState={currentState} getDynamicDistrict={getDynamicDistrict} />
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-6 text-[10px] text-gray-500">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500" /> High Activity</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500" /> Medium</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-400" /> Low</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> Delayed Project</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> On Track</span>
            </div>
          </motion.div>

          {/* Right column — Alerts + Feed */}
          <div className="flex flex-col gap-6">
            {/* Delayed Alerts */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl shadow-md border border-gray-100">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-base font-black text-[#1a1a2e] flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-500" />
                  Delayed Projects
                  <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">{delayedAlerts.length}</span>
                </h2>
              </div>
              <div className="p-4 space-y-3">
                {delayedAlerts.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                    className="p-3 rounded-xl bg-red-50/70 border border-red-100 hover:bg-red-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="text-sm font-bold text-gray-900 group-hover:text-red-600 transition-colors">{a.name}</div>
                      <span className="flex-shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-200 text-red-700">
                        {a.delayDays}d late
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-500 mb-1.5">{a.district} · {a.stage}</div>
                    <div className="text-xs text-red-600 leading-relaxed font-medium">{a.issue}</div>
                    <div className="text-[10px] text-gray-400 mt-2 flex items-center gap-1"><Clock size={10} /> {a.lastAction}</div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Activity Feed */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl flex-1 flex flex-col shadow-md border border-gray-100">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-base font-black text-[#1a1a2e] flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" />
                  Recent Activity
                </h2>
              </div>
              <div className="flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1 max-h-[300px]">
                {stateActivityFeed.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.05 }}
                    className="flex gap-3 p-2.5 rounded-xl hover:bg-orange-50/50 transition-colors cursor-default"
                  >
                    <div className="mt-0.5 flex-shrink-0">{actTypeIcons[item.type] || <Activity size={14} className="text-gray-400" />}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-gray-700 leading-snug">{item.message}</div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                        <Clock size={9} /> {item.timestamp}
                        <span className="text-gray-300">·</span>
                        <span>{item.district}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-100 flex items-center justify-center gap-2 text-[10px] text-gray-400">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" /> Live — {profile.state} only
              </div>
            </motion.div>
          </div>
        </div>

        {/* ─── Compensation Bar Chart ─────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                <BarChart3 size={18} className="text-orange-500" />
                District-wise Compensation Overview
              </h2>
              <p className="text-xs text-gray-400 mt-1">Sanctioned vs Disbursed (₹ Cr) — identifies payment bottlenecks</p>
            </div>
          </div>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 40, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" horizontal={false} />
                <XAxis type="number" stroke="rgba(0,0,0,0.15)" tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                <YAxis type="category" dataKey="name" width={110} stroke="rgba(0,0,0,0.15)" tick={{ fill: '#374151', fontSize: 11, fontWeight: 600 }} />
                <RTooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,153,51,0.05)' }} />
                <Legend
                  wrapperStyle={{ paddingTop: 16 }}
                  formatter={(val) => <span style={{ color: '#4b5563', fontSize: 11 }}>{val}</span>}
                />
                <Bar dataKey="sanctioned" name="Sanctioned (Saffron)" fill="#FF9933" radius={[0, 6, 6, 0]} barSize={14} />
                <Bar dataKey="disbursed" name="Disbursed (India Green)" fill="#138808" radius={[0, 6, 6, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* ─── Ongoing Projects Table ─────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
          <div className="p-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                <TrendingUp size={18} className="text-emerald-500" />
                Ongoing Projects
                <span className="text-xs font-normal text-gray-400 ml-2">
                  ({filteredProjects.length} of {ongoingProjects.length})
                </span>
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-56 pl-9 pr-4 py-2 rounded-xl bg-gray-50 border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
                />
              </div>
              {/* Stage filter */}
              <div className="flex items-center gap-1 bg-gray-50 rounded-xl p-1 border border-gray-200">
                {['All', 'Notification', 'Award', 'Compensation', 'Possession', 'R&R'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStageFilter(s)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                      stageFilter === s ? 'bg-white text-[#FF9933] shadow-sm border border-orange-100' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Project Name', 'District', 'Stage', 'Area (acres)', 'Families', 'Compensation %', 'Last Updated', 'Status'].map(h => (
                    <th key={h} className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {filteredProjects.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`cursor-pointer transition-colors group ${
                        p.delayed
                          ? 'bg-red-50/50 hover:bg-red-50/80 border-l-2 border-l-red-500'
                          : 'hover:bg-orange-50/50'
                      }`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {p.delayed && <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />}
                          <span className="text-sm font-semibold text-gray-800 group-hover:text-[#FF9933] transition-colors">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{p.district}</td>
                      <td className="px-5 py-4"><StageBadge stage={p.stage} /></td>
                      <td className="px-5 py-4 text-sm font-mono text-gray-700 font-medium">{p.area.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-4 text-sm font-mono text-gray-600">{p.families}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${p.compensationPercent >= 80 ? 'bg-emerald-500' : p.compensationPercent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${p.compensationPercent}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-gray-500">{p.compensationPercent}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-400 font-mono">{p.lastUpdated}</td>
                      <td className="px-5 py-4">
                        {p.delayed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">
                            <AlertTriangle size={10} />
                            {p.delayDays}d delayed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={10} /> On Track
                          </span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {filteredProjects.length === 0 && (
            <div className="py-16 text-center">
              <Search size={36} className="text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">No projects match your filters</p>
            </div>
          )}

          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Showing {filteredProjects.length} of {ongoingProjects.length} projects</span>
            <span className="flex items-center gap-1"><Zap size={11} className="text-emerald-500" /> Live · {profile.state}</span>
          </div>
        </motion.div>
      </main>

      {/* ─── Action Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {modal && (
          <ActionModal
            type={modal.type}
            proposal={modal.proposal}
            onClose={() => setModal(null)}
            onConfirm={() => handleProposalAction(modal.proposal.id)}
          />
        )}
      </AnimatePresence>

      {/* ─── Map Tooltip Styles ────────────────────────────────────── */}
      <style>{`
        .state-tooltip {
          background: rgba(255,255,255,0.98) !important;
          border: 1px solid rgba(255,153,51,0.3) !important;
          border-radius: 12px !important;
          padding: 10px 14px !important;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
          color: #1a1a2e !important;
        }
        .state-tooltip::before { border-top-color: rgba(255,255,255,0.98) !important; }
        .leaflet-container { background: transparent !important; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>
    </div>
  );
}
