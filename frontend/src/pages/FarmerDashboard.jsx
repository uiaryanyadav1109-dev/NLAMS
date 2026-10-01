import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  MapPin, Bell, LogOut, Languages, Download, FileText,
  CheckCircle2, Clock, AlertTriangle, ChevronRight, User,
  IndianRupee, Home, Briefcase, Truck, GraduationCap, BadgeCheck,
  XCircle, MessageSquarePlus, Send, Landmark, Shield, Eye,
  ArrowUpRight, CreditCard, Calendar, CircleDot, ChevronDown,
  Sprout, Scale
} from 'lucide-react';
import { MapContainer, TileLayer, Rectangle, Marker, Popup, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  farmerProfile, landParcel, acquisitionSteps, compensationData,
  rrStatus, documents, grievances, grievanceTypes, labels
} from '../data/farmerData';
import AIChatbot from '../components/AIChatbot';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// ─── Fade-in wrapper ──────────────────────────────────────────────────────────
const FadeIn = ({ children, delay = 0, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// ─── Yes/No/Pending Badge ─────────────────────────────────────────────────────
function StatusBadge({ value, lang }) {
  const t = labels[lang];
  const cfgMap = {
    Yes:     { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={12} />, label: t.yes },
    No:      { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: <XCircle size={12} />, label: t.no },
    Pending: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', icon: <Clock size={12} />, label: t.pending },
    Paid:    { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: <CheckCircle2 size={12} />, label: t.paid },
  };
  const c = cfgMap[value] || cfgMap.Pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${c.bg} ${c.text} ${c.border}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Acquisition Status Badge (big) ───────────────────────────────────────────
function AcquisitionBadge({ status }) {
  const colors = {
    Notification: 'from-blue-500 to-blue-600',
    Award: 'from-purple-500 to-purple-600',
    Compensation: 'from-amber-500 to-orange-500',
    Possession: 'from-emerald-500 to-emerald-600',
    'R&R': 'from-cyan-500 to-cyan-600',
  };
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white bg-gradient-to-r ${colors[status] || colors.Compensation} shadow-md`}>
      <CircleDot size={14} className="animate-pulse" />
      {status} Stage
    </span>
  );
}

function LandMiniMap() {
  const [geoData, setGeoData] = React.useState(null);

  React.useEffect(() => {
    fetch('http://localhost:3000/api/parcels')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error("Error fetching map data:", err));
  }, []);

  return (
    <div className="h-52 rounded-xl overflow-hidden border border-gray-200 relative">
      <MapContainer
        center={[21.1458, 79.0882]}
        zoom={14}
        scrollWheelZoom={true}
        dragging={true}
        zoomControl={true}
        attributionControl={false}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {geoData && (
          <GeoJSON 
            data={geoData} 
            style={{
              color: '#FF9933',
              weight: 2,
              fillColor: '#FF9933',
              fillOpacity: 0.4
            }}
            onEachFeature={(feature, layer) => {
              layer.bindPopup(`<strong style="color:#1a1a2e">${feature.properties.owner_name}</strong><br/>Area: ${feature.properties.parcel_area} acres`);
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
function AcquisitionStepper({ lang }) {
  const t = labels[lang];

  return (
    <div className="w-full">
      {/* Desktop stepper */}
      <div className="hidden md:flex items-start justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-6 left-[10%] right-[10%] h-0.5 bg-gray-200" />
        <div
          className="absolute top-6 left-[10%] h-0.5 bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-1000"
          style={{
            width: `${((acquisitionSteps.filter(s => s.status === 'completed').length + 0.5) / acquisitionSteps.length) * 80}%`,
          }}
        />

        {acquisitionSteps.map((step, i) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';
          const isPending = step.status === 'pending';

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12 }}
              className="flex flex-col items-center text-center relative z-10 flex-1"
            >
              {/* Circle */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                isCompleted
                  ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-200'
                  : isCurrent
                    ? 'bg-amber-500 border-amber-400 shadow-md shadow-orange-200 animate-pulse'
                    : 'bg-gray-100 border-gray-300'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 size={20} className="text-white" />
                ) : isCurrent ? (
                  <CircleDot size={20} className="text-white" />
                ) : (
                  <span className="text-sm font-bold text-gray-400">{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <div className={`mt-3 text-sm font-bold ${
                isCompleted ? 'text-emerald-600' : isCurrent ? 'text-orange-500' : 'text-gray-400'
              }`}>
                {lang === 'hi' ? step.labelHi : step.label}
              </div>

              {/* Description */}
              <div className="mt-1 text-[10px] text-gray-500 max-w-[120px] leading-tight">
                {lang === 'hi' ? step.descriptionHi : step.description}
              </div>

              {/* Dates */}
              <div className="mt-3 space-y-1">
                <div className="text-[10px] text-gray-400">
                  {t.expected}: <span className="text-gray-600 font-mono">{step.expectedDate}</span>
                </div>
                {step.actualDate && (
                  <div className="text-[10px] text-gray-400">
                    {t.actual}: <span className="text-emerald-600 font-mono">{step.actualDate}</span>
                  </div>
                )}
              </div>

              {/* Delay flag */}
              {step.delayDays > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-200"
                >
                  <AlertTriangle size={10} className="text-red-500" />
                  <span className="text-[10px] font-bold text-red-600">
                    {t.delayed} {step.delayDays} {t.days}
                  </span>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Mobile stepper (vertical) */}
      <div className="md:hidden space-y-4">
        {acquisitionSteps.map((step, i) => {
          const isCompleted = step.status === 'completed';
          const isCurrent = step.status === 'current';

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4"
            >
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 ${
                  isCompleted
                    ? 'bg-emerald-500 border-emerald-400'
                    : isCurrent
                      ? 'bg-amber-500 border-amber-400 animate-pulse'
                      : 'bg-gray-100 border-gray-300'
                }`}>
                  {isCompleted ? <CheckCircle2 size={14} className="text-white" /> :
                   isCurrent ? <CircleDot size={14} className="text-white" /> :
                   <span className="text-xs font-bold text-gray-400">{i + 1}</span>}
                </div>
                {i < acquisitionSteps.length - 1 && (
                  <div className={`w-0.5 flex-1 mt-1 ${isCompleted ? 'bg-emerald-500' : 'bg-gray-200'}`} />
                )}
              </div>

              <div className="pb-4 flex-1">
                <div className={`font-bold text-sm ${
                  isCompleted ? 'text-emerald-600' : isCurrent ? 'text-orange-500' : 'text-gray-400'
                }`}>
                  {lang === 'hi' ? step.labelHi : step.label}
                </div>
                <div className="text-[11px] text-gray-500 mt-0.5">
                  {lang === 'hi' ? step.descriptionHi : step.description}
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-gray-400">
                  <span>{t.expected}: <span className="font-mono text-gray-600">{step.expectedDate}</span></span>
                  {step.actualDate && <span>{t.actual}: <span className="font-mono text-emerald-600">{step.actualDate}</span></span>}
                </div>
                {step.delayDays > 0 && (
                  <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-200">
                    <AlertTriangle size={10} className="text-red-500" />
                    <span className="text-[10px] font-bold text-red-600">{t.delayed} {step.delayDays} {t.days}</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Farmer Dashboard ────────────────────────────────────────────────────
export default function FarmerDashboard() {
  const navigate = useNavigate();
  const [lang, setLang] = useState('en');
  const [showGrievanceForm, setShowGrievanceForm] = useState(false);
  const [grievanceType, setGrievanceType] = useState('');
  const [grievanceDesc, setGrievanceDesc] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const t = labels[lang];
  const isHi = lang === 'hi';
  const profile = farmerProfile;
  const parcel = landParcel;
  const comp = compensationData;
  const paidPercent = Math.round((comp.amountPaid / comp.totalSanctioned) * 100);

  const formatINR = (n) => '₹' + n.toLocaleString('en-IN');

  const handleSubmitGrievance = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setShowGrievanceForm(false);
      setSubmitted(false);
      setGrievanceType('');
      setGrievanceDesc('');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#FFF8F0] relative overflow-hidden text-[#1a1a2e]">
      {/* Background ambient glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-10 w-96 h-96 bg-green-200/20 rounded-full blur-3xl pointer-events-none" />

      {/* Tiranga accent — top */}
      <div className="h-1.5 tiranga-bar" />

      {/* ─── Top Bar ────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-orange-100 shadow-sm"
        style={{ background: 'rgba(255,248,240,0.96)', backdropFilter: 'blur(20px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Left — Logo + Farmer info */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 group">
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
                className="w-9 h-9 rounded-lg flex items-center justify-center shadow-md"
                style={{ background: 'linear-gradient(135deg, #FF9933, #FFFFFF, #138808)' }}
              >
                <span className="text-gray-800 font-black text-xs">🇮🇳</span>
              </motion.div>
              <div>
                <div className="text-[#003580] font-black text-sm leading-tight">NLAMS</div>
                <div className="text-[8px] text-[#138808] font-bold tracking-widest uppercase">Govt. of India</div>
              </div>
            </Link>

            <div className="hidden xl:block h-7 w-px bg-gray-300 mx-1" />

            {/* Farmer identity */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shadow-md text-sm"
                style={{ background: 'linear-gradient(135deg, #FF9933, #E07800)' }}>
                🌾
              </div>
              <div>
                <div className="text-xs font-bold text-[#1a1a2e] leading-tight">
                  {isHi ? profile.nameHi : profile.name}
                </div>
                <div className="text-[10px] text-gray-500">
                  {isHi ? profile.villageHi : profile.village}, {isHi ? profile.districtHi : profile.district}
                </div>
              </div>
            </div>
          </div>

          {/* Center — Persona Quick Switcher */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-orange-50 border border-orange-200 shadow-inner">
            <Link
              to="/dashboard"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-[#FF9933] hover:bg-white transition-all flex items-center gap-1.5"
            >
              <span>🏛️</span>
              <span className="hidden md:inline">National View</span>
            </Link>
            <Link
              to="/state-dashboard"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-[#FF9933] hover:bg-white transition-all flex items-center gap-1.5"
            >
              <span>🗳️</span>
              <span className="hidden md:inline">State (MH)</span>
            </Link>
            <Link
              to="/district-dashboard"
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:text-[#FF9933] hover:bg-white transition-all flex items-center gap-1.5"
            >
              <span>📋</span>
              <span className="hidden md:inline">District (Pune)</span>
            </Link>
            <span
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-md flex items-center gap-1.5"
              style={{ background: 'linear-gradient(135deg, #FF9933, #E07800)' }}
            >
              <span>🌾</span>
              <span className="hidden md:inline">Farmer Portal</span>
            </span>
            <Link
              to="/"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#FF9933] hover:bg-white transition-all flex items-center gap-1"
              title="Return to Public Home"
            >
              <span>🏠</span>
            </Link>
          </div>

          {/* Right — Actions */}
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border border-gray-300 hover:border-orange-400 hover:bg-orange-50 transition-all shadow-sm"
            >
              <Languages size={13} className="text-[#FF9933]" />
              <span className="text-gray-700">{lang === 'en' ? 'हिंदी' : 'English'}</span>
            </motion.button>

            {/* Bell */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative p-2 rounded-xl text-gray-500 hover:text-[#FF9933] hover:bg-orange-50 transition-all"
            >
              <Bell size={16} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse bg-[#FF9933]" />
            </motion.button>

            {/* Logout */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/auth')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 border border-gray-200 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">{t.logout}</span>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* ─── Main Content ─────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ─── My Land Card + Mini Map ────────────────────────────── */}
        <FadeIn delay={0}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                <Sprout size={20} className="text-emerald-600" />
                {t.myLand}
              </h2>
              <AcquisitionBadge status={parcel.acquisitionStatus} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
              {/* Map */}
              <div className="lg:col-span-2 p-5">
                <LandMiniMap />
              </div>

              {/* Land Details */}
              <div className="lg:col-span-3 p-5 lg:border-l border-gray-100">
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <DetailRow label={t.plotNumber} value={parcel.plotNumber} mono />
                  <DetailRow label={t.surveyNo} value={parcel.surveyNumber} mono />
                  <DetailRow label={t.area} value={`${parcel.area} ${t.acres} (${parcel.areaHectare} ${t.hectare})`} />
                  <DetailRow label={t.landType} value={isHi ? parcel.landTypeHi : parcel.landType} />
                  <DetailRow label={t.crop} value={isHi ? parcel.cropGrownHi : parcel.cropGrown} />
                  <DetailRow label={t.village} value={isHi ? parcel.location.villageHi : parcel.location.village} />
                  <DetailRow label={t.taluka} value={isHi ? parcel.location.talukaHi : parcel.location.taluka} />
                  <DetailRow label={t.district} value={isHi ? parcel.location.districtHi : parcel.location.district} />
                </div>

                {/* Acquiring Project */}
                <div className="mt-6 p-4 rounded-xl bg-orange-50/60 border border-orange-100">
                  <div className="text-[10px] uppercase tracking-widest text-orange-600 font-bold mb-2">{t.project}</div>
                  <div className="text-[#1a1a2e] font-bold text-sm mb-1">
                    {isHi ? parcel.projectNameHi : parcel.projectName}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Landmark size={11} className="text-orange-500" /> {t.purpose}: <span className="text-gray-700 font-medium">{isHi ? parcel.projectPurposeHi : parcel.projectPurpose}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield size={11} className="text-emerald-600" /> {t.acquiringBody}: <span className="text-gray-700 font-medium">{isHi ? parcel.acquiringBodyHi : parcel.acquiringBody}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* ─── Acquisition Status Stepper ─────────────────────────── */}
        <FadeIn delay={0.1}>
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-md border border-gray-100">
            <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2 mb-8">
              <Scale size={20} className="text-orange-500" />
              {t.stepper}
            </h2>
            <AcquisitionStepper lang={lang} />
          </div>
        </FadeIn>

        {/* ─── Compensation + R&R Row ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Compensation Card */}
          <FadeIn delay={0.15}>
            <div className="bg-white rounded-2xl h-full shadow-md border border-gray-100">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                  <IndianRupee size={20} className="text-orange-500" />
                  {t.compensation}
                </h2>
              </div>
              <div className="p-5 space-y-5">
                {/* Amounts */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div className="text-[10px] text-emerald-700 font-bold uppercase mb-1">{t.totalSanctioned}</div>
                    <div className="text-lg font-black text-emerald-700">{formatINR(comp.totalSanctioned)}</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="text-[10px] text-blue-700 font-bold uppercase mb-1">{t.amountPaid}</div>
                    <div className="text-lg font-black text-blue-700">{formatINR(comp.amountPaid)}</div>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-orange-50 border border-orange-200">
                    <div className="text-[10px] text-orange-700 font-bold uppercase mb-1">{t.amountPending}</div>
                    <div className="text-lg font-black text-orange-600">{formatINR(comp.amountPending)}</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between mb-2 text-xs">
                    <span className="text-gray-500">{t.amountPaid}</span>
                    <span className="text-[#1a1a2e] font-bold">{paidPercent}%</span>
                  </div>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${paidPercent}%` }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-500"
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-gray-500">
                    <CreditCard size={13} className="text-gray-400" />
                    {t.paymentMode}: <span className="text-gray-800 font-medium">{isHi ? comp.paymentModeHi : comp.paymentMode}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar size={13} className="text-gray-400" />
                    {t.expectedPayment}: <span className="text-gray-800 font-mono font-medium">{comp.expectedPaymentDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Landmark size={13} className="text-gray-400" />
                    {comp.bankName} (****{comp.bankAccountLast4})
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    {t.bankLinked}: <StatusBadge value={comp.bankLinked ? 'Yes' : 'No'} lang={lang} />
                  </div>
                </div>

                {/* Payment history */}
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t.paymentHistory}</div>
                  <div className="space-y-2">
                    {comp.payments.map((p, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 hover:bg-orange-50/50 transition-colors border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                            p.status === 'Paid' ? 'bg-emerald-100' : 'bg-orange-100'
                          }`}>
                            {p.status === 'Paid' ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Clock size={13} className="text-orange-500" />}
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-gray-800">{isHi ? p.typeHi : p.type}</div>
                            <div className="text-[10px] text-gray-400 font-mono">{p.date}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-800 font-mono">{formatINR(p.amount)}</span>
                          <StatusBadge value={p.status} lang={lang} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>

          {/* R&R Status Card */}
          <FadeIn delay={0.2}>
            <div className="bg-white rounded-2xl h-full shadow-md border border-gray-100">
              <div className="p-5 border-b border-gray-100 bg-gray-50">
                <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                  <Home size={20} className="text-sky-600" />
                  {t.rrTitle}
                </h2>
              </div>
              <div className="p-5 space-y-4">
                {/* Eligibility highlight */}
                <div className={`p-4 rounded-xl border ${
                  rrStatus.eligible
                    ? 'bg-emerald-50 border-emerald-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      rrStatus.eligible ? 'bg-emerald-100' : 'bg-red-100'
                    }`}>
                      {rrStatus.eligible ? <BadgeCheck size={20} className="text-emerald-600" /> : <XCircle size={20} className="text-red-500" />}
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">{t.rrEligible}</div>
                      <div className={`text-lg font-black ${rrStatus.eligible ? 'text-emerald-700' : 'text-red-600'}`}>
                        {rrStatus.eligible ? t.yes : t.no}
                      </div>
                    </div>
                  </div>
                </div>

                {/* R&R Items */}
                <div className="space-y-3">
                  <RRItem icon={<Home size={16} />} label={t.houseAllotted} value={rrStatus.houseAllotted} lang={lang} color="cyan" />
                  <RRItem icon={<Briefcase size={16} />} label={t.employment} value={rrStatus.employmentAssistance} lang={lang} color="blue" />
                  <RRItem icon={<Truck size={16} />} label={t.relocation} value={rrStatus.relocationSupport} lang={lang} color="purple" />
                  <RRItem icon={<GraduationCap size={16} />} label={t.skillTraining} value={rrStatus.skillTraining} lang={lang} color="emerald" />
                </div>

                {/* Annuity */}
                {rrStatus.annuity === 'Yes' && (
                  <div className="p-4 rounded-xl bg-orange-50/70 border border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IndianRupee size={18} className="text-orange-500" />
                        <div>
                          <div className="text-xs text-gray-500">{t.annuity}</div>
                          <div className="text-lg font-black text-orange-600">{formatINR(rrStatus.annuityAmount)}<span className="text-xs text-gray-500 font-normal"> / year</span></div>
                        </div>
                      </div>
                      <StatusBadge value="Yes" lang={lang} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </FadeIn>
        </div>

        {/* ─── My Documents ───────────────────────────────────────── */}
        <FadeIn delay={0.25}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                <FileText size={20} className="text-purple-600" />
                {t.documents}
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {documents.map((doc, i) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-orange-50/40 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      doc.available ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <FileText size={18} className={doc.available ? 'text-purple-600' : 'text-gray-400'} />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${doc.available ? 'text-gray-800' : 'text-gray-400'}`}>
                        {isHi ? doc.nameHi : doc.name}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-gray-400">
                        {doc.dateIssued && (
                          <span>{t.dateIssued}: <span className="font-mono text-gray-600">{doc.dateIssued}</span></span>
                        )}
                        {doc.fileSize && <span>{doc.fileSize}</span>}
                      </div>
                    </div>
                  </div>

                  {doc.available ? (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-700 bg-purple-100 border border-purple-200 hover:bg-purple-200 transition-all"
                    >
                      <Download size={13} />
                      {t.download}
                    </motion.button>
                  ) : (
                    <span className="text-[10px] text-gray-400 italic">{t.notAvailable}</span>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </FadeIn>

        {/* ─── Grievance Section ───────────────────────────────────── */}
        <FadeIn delay={0.3}>
          <div className="bg-white rounded-2xl overflow-hidden shadow-md border border-gray-100">
            <div className="p-5 border-b border-gray-100 bg-gray-50">
              <h2 className="text-lg font-black text-[#1a1a2e] flex items-center gap-2">
                <MessageSquarePlus size={20} className="text-red-500" />
                {t.grievance}
              </h2>
              <p className="text-xs text-gray-500 mt-1">{t.grievanceDesc}</p>
            </div>

            <div className="p-5 space-y-5">
              {/* Past Complaints */}
              {grievances.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{t.pastComplaints}</div>
                  {grievances.map((g) => (
                    <div key={g.id} className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3 mb-3 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="text-xs text-gray-400">{t.complaintId}: <span className="font-mono text-gray-600">{g.id}</span></div>
                          <div className="text-sm font-bold text-gray-900 mt-1">{isHi ? g.typeHi : g.type}</div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                          {isHi ? g.statusHi : g.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">{isHi ? g.descriptionHi : g.description}</p>
                      <div className="flex flex-wrap gap-4 text-[10px] text-gray-400">
                        <span>{t.submittedOn}: <span className="font-mono text-gray-600">{g.submittedOn}</span></span>
                        <span>{t.lastUpdate}: <span className="font-mono text-gray-600">{g.lastUpdate}</span></span>
                      </div>
                      {g.responseNote && (
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 leading-relaxed font-medium">
                          💬 {isHi ? g.responseNoteHi : g.responseNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Raise New Complaint */}
              <AnimatePresence>
                {!showGrievanceForm ? (
                  <motion.button
                    key="open-btn"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowGrievanceForm(true)}
                    className="w-full py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-md shadow-red-200 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageSquarePlus size={18} />
                    {t.grievance}
                  </motion.button>
                ) : (
                  <motion.form
                    key="form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    onSubmit={handleSubmitGrievance}
                    className="space-y-4 p-4 rounded-xl border border-red-200 bg-red-50/50 overflow-hidden"
                  >
                    {submitted ? (
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: 1 }}
                        className="text-center py-6"
                      >
                        <CheckCircle2 size={40} className="text-emerald-500 mx-auto mb-3" />
                        <div className="text-lg font-bold text-emerald-700">
                          {lang === 'en' ? 'Complaint Submitted!' : 'शिकायत दर्ज हो गई!'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {lang === 'en' ? 'You will be notified about updates.' : 'आपको अपडेट की सूचना दी जाएगी।'}
                        </div>
                      </motion.div>
                    ) : (
                      <>
                        <select
                          value={grievanceType}
                          onChange={e => setGrievanceType(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-[#1a1a2e] focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" disabled className="bg-white">{t.selectIssue}</option>
                          {grievanceTypes.map(gt => (
                            <option key={gt.value} value={gt.value} className="bg-white">
                              {isHi ? gt.labelHi : gt.label}
                            </option>
                          ))}
                        </select>

                        <textarea
                          value={grievanceDesc}
                          onChange={e => setGrievanceDesc(e.target.value)}
                          required
                          placeholder={t.describeIssue}
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl bg-white border border-gray-200 text-sm text-[#1a1a2e] placeholder-gray-400 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-none"
                        />

                        <div className="flex gap-3">
                          <motion.button
                            type="submit"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center gap-2 shadow-md shadow-red-200"
                          >
                            <Send size={14} />
                            {t.submitComplaint}
                          </motion.button>
                          <button
                            type="button"
                            onClick={() => setShowGrievanceForm(false)}
                            className="px-4 py-2.5 rounded-xl text-sm text-gray-600 border border-gray-200 hover:bg-gray-100 transition-all"
                          >
                            ✕
                          </button>
                        </div>
                      </>
                    )}
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </FadeIn>

      </main>

      {/* Leaflet styles */}
      <style>{`
        .leaflet-container { background: #f8fafc !important; }
        .leaflet-control-attribution { display: none !important; }
      `}</style>

      {/* AI Chatbot Widget */}
      <AIChatbot 
        lang={lang} 
        context={{
          survey_no: parcel.surveyNumber,
          project_name: isHi ? parcel.projectNameHi : parcel.projectName,
          status: parcel.acquisitionStatus,
          compensation_amount: comp.totalSanctioned,
          designated_officer: isHi ? parcel.acquiringBodyHi : parcel.acquiringBody
        }}
      />
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DetailRow({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-0.5">{label}</div>
      <div className={`text-sm text-gray-800 font-semibold ${mono ? 'font-mono' : ''}`}>{value}</div>
    </div>
  );
}

function RRItem({ icon, label, value, lang, color }) {
  const colorMap = {
    cyan: 'bg-cyan-100 text-cyan-700',
    blue: 'bg-blue-100 text-blue-700',
    purple: 'bg-purple-100 text-purple-700',
    emerald: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-orange-50/50 transition-colors border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-sm text-gray-700 font-medium">{label}</span>
      </div>
      <StatusBadge value={value} lang={lang} />
    </div>
  );
}
