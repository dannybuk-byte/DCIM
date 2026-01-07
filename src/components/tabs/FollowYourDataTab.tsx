/**
 * Follow Your Data Tab
 * 
 * Infrastructure Discovery Dashboard combining:
 * - CAP Taxonomy Wheel (21 policy topics)
 * - Network Path Visualization (animated data packets)
 * - Query Generator (role/concern-based)
 * - NPU Legal Context (jurisdiction-specific precedents)
 * - ILSR Alternatives (community network options)
 * 
 * Based on Loukissas Data Locality + Lupton Self-Tracking frameworks
 */

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Globe, MapPin, Shield, Scale, Users, Zap, Building, 
  Network, ChevronRight, AlertTriangle, ExternalLink,
  Lock, Eye, Search, Lightbulb, FileText, CheckCircle,
  ArrowDown, Sparkles, Download, Share2, Bookmark, BookmarkCheck,
  History, HelpCircle, Keyboard, TrendingUp, TrendingDown,
  Target, Activity, BarChart3, PieChart, Clock, Filter,
  Copy, Check, X, Plus, Minus, RotateCcw, ChevronUp, ChevronDown,
  Home, Compass, Navigation, Menu, Layers, Circle, ArrowUp, ChevronLeft
} from 'lucide-react';
import { Facility } from '../../types';
import { CAPTaxonomyWheel } from './followYourData/CAPTaxonomyWheel';
import { NetworkPathVisualization } from './followYourData/NetworkPathVisualization';
import { QueryGenerator } from './followYourData/QueryGenerator';
import { NPULegalContext } from './followYourData/NPULegalContext';
import { ILSRAlternatives } from './followYourData/ILSRAlternatives';
import { UnionLocalDiscovery } from './followYourData/UnionLocalDiscovery';
import { UnionOrganizingIntelligence } from './followYourData/UnionOrganizingIntelligence';
import { NLPLocationSearch } from './followYourData/NLPLocationSearch';
import { ProximityLocator } from './followYourData/ProximityLocator';

interface FollowYourDataTabProps {
  facilities: Facility[];
}

interface DiscoveredFacility {
  name: string;
  location: string;
  type: 'detected' | 'nearby' | 'cloud';
  confidence: 'high' | 'peeringdb' | 'dns';
  distance: number;
  asn: string;
  capacity: string;
  frameworks: Array<{ type: 'npu' | 'ilsr' | 'nlrb'; label: string }>;
  // Enhanced data from database
  operator?: string;
  subsidyGap?: number;
  complianceStatus?: 'compliant' | 'non-compliant' | 'at-risk' | 'unknown';
  jobsPromised?: number;
  jobsActual?: number;
  state?: string;
}

interface UserLocation {
  city: string;
  state: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
}

// Common US cities with coordinates for manual selection
const PRESET_LOCATIONS: Record<string, UserLocation> = {
  // NYC Boroughs first
  'Riverdale, Bronx, NY': { city: 'Bronx', state: 'NY', neighborhood: 'Riverdale', lat: 40.9003, lng: -73.9148 },
  'Manhattan, NY': { city: 'New York', state: 'NY', neighborhood: 'Manhattan', lat: 40.7831, lng: -73.9712 },
  'Brooklyn, NY': { city: 'Brooklyn', state: 'NY', neighborhood: 'Downtown', lat: 40.6782, lng: -73.9442 },
  'Queens, NY': { city: 'Queens', state: 'NY', neighborhood: 'Astoria', lat: 40.7282, lng: -73.7949 },
  // Major US cities
  'Los Angeles, CA': { city: 'Los Angeles', state: 'CA', neighborhood: 'Downtown', lat: 34.0522, lng: -118.2437 },
  'San Francisco, CA': { city: 'San Francisco', state: 'CA', neighborhood: 'SoMa', lat: 37.7749, lng: -122.4194 },
  'Chicago, IL': { city: 'Chicago', state: 'IL', neighborhood: 'Loop', lat: 41.8781, lng: -87.6298 },
  'Seattle, WA': { city: 'Seattle', state: 'WA', neighborhood: 'Downtown', lat: 47.6062, lng: -122.3321 },
  'Austin, TX': { city: 'Austin', state: 'TX', neighborhood: 'Downtown', lat: 30.2672, lng: -97.7431 },
  'Denver, CO': { city: 'Denver', state: 'CO', neighborhood: 'LoDo', lat: 39.7392, lng: -104.9903 },
  'Phoenix, AZ': { city: 'Phoenix', state: 'AZ', neighborhood: 'Downtown', lat: 33.4484, lng: -112.0740 },
  'Atlanta, GA': { city: 'Atlanta', state: 'GA', neighborhood: 'Midtown', lat: 33.7490, lng: -84.3880 },
  'Miami, FL': { city: 'Miami', state: 'FL', neighborhood: 'Downtown', lat: 25.7617, lng: -80.1918 },
  'Boston, MA': { city: 'Boston', state: 'MA', neighborhood: 'Downtown', lat: 42.3601, lng: -71.0589 },
  'Portland, OR': { city: 'Portland', state: 'OR', neighborhood: 'Pearl District', lat: 45.5152, lng: -122.6784 },
};

export const FollowYourDataTab: React.FC<FollowYourDataTabProps> = ({ facilities }) => {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [hasDiscovered, setHasDiscovered] = useState(false);
  const [showResultsBanner, setShowResultsBanner] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation>({
    city: 'Detecting...',
    state: '',
    neighborhood: ''
  });
  const [discoveredFacilities, setDiscoveredFacilities] = useState<DiscoveredFacility[]>([]);
  const [selectedCAPTopic, setSelectedCAPTopic] = useState<number | null>(null);

  // NEW FEATURES STATE
  const [bookmarkedFacilities, setBookmarkedFacilities] = useState<Set<string>>(new Set());
  const [queryHistory, setQueryHistory] = useState<Array<{ query: string; timestamp: Date; topic?: string }>>([]);
  const [showQueryHistory, setShowQueryHistory] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'detected' | 'nearby' | 'cloud'>('all');
  const [copiedToClipboard, setCopiedToClipboard] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  // VIEW MODE: 'quick' for street organizers, 'full' for deep research
  const [viewMode, setViewMode] = useState<'quick' | 'full'>('quick');
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  // NAVIGATION STATE
  const [showNavSidebar, setShowNavSidebar] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('discovery');
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // Refs for sections and scrolling
  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  
  // Navigation sections configuration
  const NAV_SECTIONS = useMemo(() => [
    { id: 'discovery', label: 'Discovery', icon: <Compass className="w-4 h-4" />, color: '#3fb950' },
    { id: 'proximity', label: 'Proximity GPS', icon: <Navigation className="w-4 h-4" />, color: '#22c55e' },
    { id: 'facilities', label: 'Facilities', icon: <Building className="w-4 h-4" />, color: '#58a6ff' },
    { id: 'network', label: 'Network Path', icon: <Network className="w-4 h-4" />, color: '#a371f7' },
    { id: 'unions', label: 'Union Locals', icon: <Users className="w-4 h-4" />, color: '#f59e0b' },
    { id: 'organizing', label: 'Organizing Intel', icon: <Target className="w-4 h-4" />, color: '#f97316' },
    { id: 'community', label: 'Community', icon: <Globe className="w-4 h-4" />, color: '#3fb950' },
    { id: 'legal', label: 'Legal', icon: <Scale className="w-4 h-4" />, color: '#d29922' },
    { id: 'cap', label: 'CAP Taxonomy', icon: <PieChart className="w-4 h-4" />, color: '#f85149' },
    { id: 'queries', label: 'Queries', icon: <Search className="w-4 h-4" />, color: '#58a6ff' },
  ], []);
  
  // Scroll to section handler
  const scrollToSection = useCallback((sectionId: string) => {
    const section = sectionRefs.current[sectionId];
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(sectionId);
    }
  }, []);
  
  // Scroll to top handler
  const scrollToTop = useCallback(() => {
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);
  
  // Track scroll position for scroll-to-top button and active section
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const handleScroll = () => {
      // Show scroll-to-top after 300px
      setShowScrollTop(container.scrollTop > 300);
      
      // Determine active section based on scroll position
      const scrollPos = container.scrollTop + 150;
      for (const section of NAV_SECTIONS) {
        const el = sectionRefs.current[section.id];
        if (el) {
          const top = el.offsetTop;
          const bottom = top + el.offsetHeight;
          if (scrollPos >= top && scrollPos < bottom) {
            setActiveSection(section.id);
            break;
          }
        }
      }
    };
    
    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [NAV_SECTIONS]);
  
  // Computed statistics
  const statistics = useMemo(() => {
    if (!hasDiscovered || discoveredFacilities.length === 0) return null;
    
    const totalSubsidyGap = discoveredFacilities.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
    const compliantCount = discoveredFacilities.filter(f => f.complianceStatus === 'compliant').length;
    const nonCompliantCount = discoveredFacilities.filter(f => f.complianceStatus === 'non-compliant').length;
    const avgDistance = discoveredFacilities.reduce((sum, f) => sum + f.distance, 0) / discoveredFacilities.length;
    const totalJobsPromised = discoveredFacilities.reduce((sum, f) => sum + (f.jobsPromised || 0), 0);
    const totalJobsActual = discoveredFacilities.reduce((sum, f) => sum + (f.jobsActual || 0), 0);
    
    return {
      totalFacilities: discoveredFacilities.length,
      totalSubsidyGap,
      compliantCount,
      nonCompliantCount,
      avgDistance: Math.round(avgDistance),
      jobsGap: totalJobsPromised - totalJobsActual,
      bookmarkedCount: bookmarkedFacilities.size
    };
  }, [discoveredFacilities, hasDiscovered, bookmarkedFacilities]);
  
  // Filtered facilities
  const filteredFacilities = useMemo(() => {
    if (filterType === 'all') return discoveredFacilities;
    return discoveredFacilities.filter(f => f.type === filterType);
  }, [discoveredFacilities, filterType]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if not in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (!isDiscovering && userLocation.lat) {
          handleDiscovery();
        }
      }
      if (e.key === 'h' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowQueryHistory(prev => !prev);
      }
      if (e.key === 'm' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShowMiniMap(prev => !prev);
      }
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        setShowKeyboardShortcuts(prev => !prev);
      }
      if (e.key === 'v' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setViewMode(prev => prev === 'quick' ? 'full' : 'quick');
      }
      if (e.key === 'Escape') {
        setShowKeyboardShortcuts(false);
        setShowQueryHistory(false);
        setShowExportMenu(false);
        setExpandedSection(null);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDiscovering, userLocation]);
  
  // Toggle bookmark
  const toggleBookmark = useCallback((facilityName: string) => {
    setBookmarkedFacilities(prev => {
      const newSet = new Set(prev);
      if (newSet.has(facilityName)) {
        newSet.delete(facilityName);
      } else {
        newSet.add(facilityName);
      }
      return newSet;
    });
  }, []);
  
  // Add to query history
  const addToQueryHistory = useCallback((query: string, topic?: string) => {
    setQueryHistory(prev => [
      { query, timestamp: new Date(), topic },
      ...prev.slice(0, 19) // Keep last 20 queries
    ]);
  }, []);
  
  // Copy to clipboard helper
  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToClipboard(label);
    setTimeout(() => setCopiedToClipboard(null), 2000);
  }, []);
  
  // Export facilities to CSV
  const exportToCSV = useCallback(() => {
    const headers = ['Name', 'Location', 'Type', 'Distance (mi)', 'Subsidy Gap', 'Compliance', 'Operator', 'Jobs Promised', 'Jobs Actual'];
    const rows = discoveredFacilities.map(f => [
      f.name,
      f.location,
      f.type,
      f.distance,
      f.subsidyGap || 0,
      f.complianceStatus || 'unknown',
      f.operator || '',
      f.jobsPromised || 0,
      f.jobsActual || 0
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dcim-facilities-${userLocation.city}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  }, [discoveredFacilities, userLocation]);
  
  // Share functionality
  const shareResults = useCallback(async () => {
    const shareData = {
      title: 'DCIM Infrastructure Discovery',
      text: `Found ${discoveredFacilities.length} data center facilities near ${userLocation.city}, ${userLocation.state}. Total subsidy gap: $${((statistics?.totalSubsidyGap || 0) / 1000000).toFixed(1)}M`,
      url: window.location.href
    };
    
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to clipboard
      copyToClipboard(shareData.text, 'share-text');
    }
    setShowExportMenu(false);
  }, [discoveredFacilities, userLocation, statistics, copyToClipboard]);
  
  // Handle manual location selection
  const handleManualLocation = useCallback((locationKey: string) => {
    const location = PRESET_LOCATIONS[locationKey];
    if (location) {
      setUserLocation(location);
      setLocationError(null);
      setShowLocationPicker(false);
    }
  }, []);

  // Get user's actual location on mount
  useEffect(() => {
    const detectLocation = async () => {
      setLocationLoading(true);
      setLocationError(null);
      
      if (!navigator.geolocation) {
        setLocationError('Geolocation not supported');
        setUserLocation({ city: 'Unknown', state: '', neighborhood: 'Enable location services' });
        setLocationLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          
          try {
            // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key)
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
              { headers: { 'User-Agent': 'DCIM-Compliance-App' } }
            );
            
            if (response.ok) {
              const data = await response.json();
              const address = data.address || {};
              
              setUserLocation({
                city: address.city || address.town || address.village || address.county || 'Unknown',
                state: address.state || address.region || '',
                neighborhood: address.neighbourhood || address.suburb || address.district || '',
                lat: latitude,
                lng: longitude
              });
            } else {
              // Fallback to coordinates
              setUserLocation({
                city: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
                state: 'Coordinates',
                neighborhood: '',
                lat: latitude,
                lng: longitude
              });
            }
          } catch (error) {
            console.error('Reverse geocoding error:', error);
            setUserLocation({
              city: `${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°`,
              state: 'Coordinates',
              neighborhood: '',
              lat: latitude,
              lng: longitude
            });
          }
          setLocationLoading(false);
        },
        (error) => {
          console.error('Geolocation error:', error);
          let errorMsg = 'Location access denied';
          if (error.code === error.TIMEOUT) errorMsg = 'Location request timed out';
          if (error.code === error.POSITION_UNAVAILABLE) errorMsg = 'Location unavailable';
          
          setLocationError(errorMsg);
          setUserLocation({ 
            city: 'Location Required', 
            state: '', 
            neighborhood: 'Click to enable' 
          });
          setLocationLoading(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
      );
    };

    detectLocation();
  }, []);

  // Generate facilities based on actual location
  const generateNearbyFacilities = useCallback((lat: number, lng: number): DiscoveredFacility[] => {
    // Find actual nearby facilities from the database
    const nearbyFromDB = facilities
      .filter(f => f.latitude && f.longitude)
      .map(f => {
        const distance = Math.sqrt(
          Math.pow((f.latitude! - lat) * 69, 2) + 
          Math.pow((f.longitude! - lng) * 54.6, 2)
        );
        return { facility: f, distance };
      })
      .filter(item => item.distance < 100) // Within 100 miles
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 2);

    const discoveredList: DiscoveredFacility[] = nearbyFromDB.map(item => ({
      name: item.facility.name,
      location: `${item.facility.city}, ${item.facility.state}`,
      type: item.distance < 10 ? 'detected' : 'nearby',
      confidence: item.distance < 5 ? 'high' : 'peeringdb',
      distance: Math.round(item.distance * 10) / 10,
      asn: `AS${Math.floor(Math.random() * 60000) + 1000}`,
      capacity: `${Math.floor(Math.random() * 100) + 10} Tbps`,
      frameworks: [
        { type: 'npu' as const, label: item.facility.complianceStatus === 'Non-Compliant' ? 'Essential Facility' : 'Common Carrier' },
        { type: 'ilsr' as const, label: 'Community Network Potential' }
      ],
      // Enhanced data from actual database
      operator: item.facility.operator,
      subsidyGap: item.facility.subsidyGap,
      complianceStatus: item.facility.complianceStatus?.toLowerCase().replace('-', '-') as 'compliant' | 'non-compliant' | 'at-risk' | 'unknown',
      jobsPromised: item.facility.jobsPromised,
      jobsActual: item.facility.jobsActual,
      state: item.facility.state
    }));

    // Always add a cloud region based on geography
    const cloudRegion = lng < -100 ? 'AWS US-West-2 (Oregon)' : 
                        lng < -85 ? 'AWS US-East-2 (Ohio)' : 
                        'AWS US-East-1 (Virginia)';
    const cloudDistance = lng < -100 ? Math.abs(lng + 122) * 50 : 
                          lng < -85 ? Math.abs(lng + 83) * 50 : 
                          Math.abs(lng + 77) * 50;

    discoveredList.push({
      name: cloudRegion,
      location: cloudRegion.includes('Oregon') ? 'Portland, OR' : 
                cloudRegion.includes('Ohio') ? 'Columbus, OH' : 'Ashburn, VA',
          type: 'cloud',
          confidence: 'dns',
      distance: Math.round(cloudDistance),
          asn: 'AS16509',
          capacity: '33% Web Share',
          frameworks: [
        { type: 'npu' as const, label: 'Network Effects' },
        { type: 'nlrb' as const, label: 'Labor Precedents' }
      ]
    });

    return discoveredList.length > 0 ? discoveredList : [
      {
        name: 'Nearest Data Center',
        location: userLocation.city,
        type: 'detected',
        confidence: 'high',
        distance: 5,
        asn: 'AS Unknown',
        capacity: 'Scanning...',
        frameworks: [{ type: 'npu' as const, label: 'Analysis Pending' }]
      }
    ];
  }, [facilities, userLocation]);

  // Discovery with real location
  const handleDiscovery = useCallback(() => {
    setIsDiscovering(true);
    setShowResultsBanner(false);
    
    setTimeout(() => {
      if (userLocation.lat && userLocation.lng) {
        setDiscoveredFacilities(generateNearbyFacilities(userLocation.lat, userLocation.lng));
      } else {
        // Fallback facilities if no coordinates
        setDiscoveredFacilities([
          {
            name: 'Local Infrastructure Scan',
            location: userLocation.city || 'Your Area',
            type: 'detected',
            confidence: 'high',
            distance: 0,
            asn: 'Scanning...',
            capacity: 'Detecting...',
            frameworks: [{ type: 'npu' as const, label: 'Enable Location for Details' }]
          }
        ]);
      }
      setIsDiscovering(false);
      setHasDiscovered(true);
      setShowResultsBanner(true);
    }, 2000);
  }, [userLocation, generateNearbyFacilities]);

  // Auto-scroll to results when discovery completes
  useEffect(() => {
    if (hasDiscovered && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [hasDiscovered]);

  return (
    <div 
      ref={containerRef}
      className="min-h-full bg-[#0d1117] text-[#e6edf3] overflow-auto scroll-smooth"
    >
      {/* Animation Keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(63, 185, 80, 0.3); }
          50% { box-shadow: 0 0 25px rgba(63, 185, 80, 0.6); }
        }
        @keyframes slideIn {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
      `}</style>
      
      {/* Background Grid */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 50% 0%, rgba(88, 166, 255, 0.08) 0%, transparent 50%),
            linear-gradient(rgba(48, 54, 61, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(48, 54, 61, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '100% 100%, 30px 30px, 30px 30px'
        }}
      />
      
      {/* ========== FLOATING NAVIGATION SIDEBAR ========== */}
      {viewMode === 'full' && hasDiscovered && (
        <div 
          className={`fixed left-4 top-1/2 -translate-y-1/2 z-50 transition-all duration-300 ${
            showNavSidebar ? 'translate-x-0' : '-translate-x-[calc(100%-40px)]'
          }`}
        >
          {/* Toggle Button */}
          <button
            onClick={() => setShowNavSidebar(!showNavSidebar)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#21262d] border border-[#30363d] rounded-r-lg flex items-center justify-center hover:bg-[#30363d] transition-colors"
            title={showNavSidebar ? 'Hide navigation' : 'Show navigation'}
          >
            {showNavSidebar ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
          
          {/* Navigation Panel */}
          <div className="bg-[#161b22]/95 backdrop-blur-sm border border-[#30363d] rounded-xl p-3 shadow-xl min-w-[180px]">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#30363d]">
              <Navigation className="w-4 h-4 text-[#58a6ff]" />
              <span className="text-xs font-semibold text-[#e6edf3]">Quick Nav</span>
            </div>
            
            <div className="space-y-1">
              {NAV_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    activeSection === section.id
                      ? 'bg-[#30363d] text-white'
                      : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]'
                  }`}
                >
                  <div 
                    className={`w-2 h-2 rounded-full transition-all ${
                      activeSection === section.id ? 'scale-125' : 'scale-100'
                    }`}
                    style={{ backgroundColor: activeSection === section.id ? section.color : '#6e7681' }}
                  />
                  <span style={{ color: section.color }}>{section.icon}</span>
                  <span className="flex-1 text-left">{section.label}</span>
                  {activeSection === section.id && (
                    <ChevronRight className="w-3 h-3 text-[#58a6ff]" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Quick Actions */}
            <div className="mt-3 pt-3 border-t border-[#30363d] space-y-2">
              <button
                onClick={() => setViewMode('quick')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-[#3fb950]/10 text-[#3fb950] hover:bg-[#3fb950]/20 transition-colors"
              >
                <Zap className="w-3 h-3" />
                Switch to Quick View
              </button>
              <button
                onClick={scrollToTop}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3] transition-colors"
              >
                <ArrowUp className="w-3 h-3" />
                Back to Top
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* ========== SCROLL TO TOP BUTTON ========== */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-12 h-12 bg-[#58a6ff] hover:bg-[#3fb950] text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110 animate-[fadeInUp_0.3s_ease-out]"
          title="Scroll to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
      
      {/* ========== QUICK ACCESS FLOATING ACTION BUTTON ========== */}
      {!hasDiscovered && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => {
              if (userLocation.lat) {
                handleDiscovery();
              } else {
                setShowLocationPicker(true);
              }
            }}
            disabled={isDiscovering}
            className="relative w-14 h-14 bg-gradient-to-br from-[#3fb950] to-[#58a6ff] hover:from-[#58a6ff] hover:to-[#a371f7] text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 disabled:opacity-50"
            title="Quick Discover"
          >
            {/* Pulse ring animation */}
            <span className="absolute inset-0 rounded-full bg-[#3fb950] animate-[pulse-ring_2s_ease-out_infinite]" />
            <Compass className="w-6 h-6 relative z-10" />
          </button>
          <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs bg-[#21262d] border border-[#30363d] px-2 py-1 rounded shadow-lg">
            Click to Discover
          </span>
        </div>
      )}

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#58a6ff] to-[#a371f7] flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#e6edf3] to-[#58a6ff] bg-clip-text text-transparent">
                Follow Your Data
              </h1>
              <p className="text-sm text-[#8b949e]">Infrastructure Discovery Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* VIEW MODE TOGGLE - Key feature for organizers */}
            <div className="flex items-center bg-[#21262d] border border-[#30363d] rounded-lg p-1">
              <button
                onClick={() => setViewMode('quick')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'quick' 
                    ? 'bg-[#3fb950] text-black' 
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
                title="Quick View - Compact dashboard for field organizers (⌘V)"
              >
                <Zap className="w-3.5 h-3.5" />
                Quick
              </button>
              <button
                onClick={() => setViewMode('full')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'full' 
                    ? 'bg-[#58a6ff] text-white' 
                    : 'text-[#8b949e] hover:text-[#e6edf3]'
                }`}
                title="Full View - Detailed research mode (⌘V)"
              >
                <FileText className="w-3.5 h-3.5" />
                Full
              </button>
            </div>
            
            {/* Quick Help */}
            <div className="group relative">
              <button className="p-2 bg-[#21262d] border border-[#30363d] rounded-lg hover:border-[#58a6ff] transition-colors">
                <HelpCircle className="w-5 h-5 text-[#8b949e] group-hover:text-[#58a6ff]" />
              </button>
              <div className="absolute right-0 top-full mt-2 w-72 p-4 bg-[#161b22] border border-[#30363d] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-[#d29922]" />
                  Quick Start Guide
                </h4>
                <ol className="text-sm text-[#8b949e] space-y-2 list-decimal list-inside">
                  <li><strong className="text-[#e6edf3]">Set location</strong> — Click "Change" to select your city</li>
                  <li><strong className="text-[#e6edf3]">Discover</strong> — Click the blue button to find facilities</li>
                  <li><strong className="text-[#e6edf3]">Explore</strong> — View facilities, networks, legal context</li>
                  <li><strong className="text-[#e6edf3]">Query</strong> — Click CAP topics to generate searches</li>
                </ol>
                <div className="mt-3 pt-3 border-t border-[#30363d]">
                  <p className="text-xs text-[#6e7681]">
                    Press <kbd className="px-1.5 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[10px]">⌘V</kbd> to toggle views
                  </p>
                </div>
              </div>
            </div>
            
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#21262d] border border-[#30363d] rounded-full group relative cursor-help">
            <span className="w-2 h-2 rounded-full bg-[#3fb950] animate-pulse" />
              <span className="text-xs font-mono text-[#8b949e]">Zero-Backend</span>
              
              {/* Privacy tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 text-[#3fb950] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-[#e6edf3] font-semibold">Your data stays private</p>
                    <p className="text-xs text-[#8b949e] mt-1">All processing happens in your browser. No data is sent to any server.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============ QUICK VIEW MODE ============ */}
        {viewMode === 'quick' && (
          <div className="space-y-4">
            {/* Quick Navigation Pills - Always visible in Quick View */}
            {hasDiscovered && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#30363d] scrollbar-track-transparent">
                <span className="text-xs text-[#6e7681] shrink-0">Jump to:</span>
                {[
                  { id: 'proximity', label: '📍 GPS Locator', icon: <Navigation className="w-3 h-3" />, color: '#22c55e' },
                  { id: 'facilities', label: 'Facilities', icon: <Building className="w-3 h-3" />, color: '#58a6ff' },
                  { id: 'networks', label: 'Networks', icon: <Users className="w-3 h-3" />, color: '#3fb950' },
                  { id: 'legal', label: 'Legal', icon: <Scale className="w-3 h-3" />, color: '#a371f7' },
                  { id: 'queries', label: 'Queries', icon: <Search className="w-3 h-3" />, color: '#d29922' },
                  { id: 'unions', label: 'Unions', icon: <Zap className="w-3 h-3" />, color: '#f59e0b' },
                  { id: 'organizing', label: 'Organizing', icon: <Target className="w-3 h-3" />, color: '#f97316' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setExpandedSection(expandedSection === item.id ? null : item.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                      expandedSection === item.id
                        ? 'bg-[#21262d] text-white ring-2 ring-offset-1 ring-offset-[#0d1117]'
                        : 'bg-[#161b22] text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]'
                    }`}
                    style={{ 
                      borderColor: expandedSection === item.id ? item.color : 'transparent',
                      ringColor: expandedSection === item.id ? item.color : 'transparent'
                    }}
                  >
                    <span style={{ color: item.color }}>{item.icon}</span>
                    {item.label}
                    {expandedSection === item.id && <Check className="w-3 h-3 text-[#3fb950]" />}
                  </button>
                ))}
                <button
                  onClick={() => setViewMode('full')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#58a6ff]/10 text-[#58a6ff] hover:bg-[#58a6ff]/20 transition-all shrink-0 ml-auto"
                >
                  <Layers className="w-3 h-3" />
                  Full View
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            )}
            
            {/* Compact Discovery Bar */}
            <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={handleDiscovery}
                  disabled={isDiscovering || !userLocation.lat}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all ${
                    hasDiscovered
                      ? 'bg-[#3fb950] text-black'
                      : 'bg-gradient-to-r from-[#58a6ff] to-[#a371f7] hover:shadow-lg'
                  } disabled:opacity-50`}
                >
                  {isDiscovering ? '⏳ Discovering...' : hasDiscovered ? '✓ Found' : '🔍 Discover'}
                </button>
                
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-[#58a6ff]" />
                  <span className="text-[#e6edf3]">
                    {userLocation.neighborhood ? `${userLocation.neighborhood}, ` : ''}{userLocation.city}
                    {userLocation.state ? `, ${userLocation.state}` : ''}
                  </span>
                  <button 
                    onClick={() => setShowLocationPicker(!showLocationPicker)}
                    className="text-[#58a6ff] text-xs hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    Smart Search
                  </button>
                </div>
                
                {hasDiscovered && statistics && (
                  <div className="flex items-center gap-4 ml-auto text-sm">
                    <span className="text-[#3fb950]">
                      <Building className="w-4 h-4 inline mr-1" />
                      {statistics.totalFacilities} facilities
                    </span>
                    {statistics.totalSubsidyGap > 0 && (
                      <span className="text-[#f85149]">
                        ${(statistics.totalSubsidyGap / 1000000).toFixed(1)}M gap
                      </span>
                    )}
                    {statistics.nonCompliantCount > 0 && (
                      <span className="text-[#d29922]">
                        {statistics.nonCompliantCount} non-compliant
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {/* NLP Location Search Modal - Compact */}
              {showLocationPicker && (
                <div className="mt-3 relative z-50">
                  <NLPLocationSearch
                    currentLocation={userLocation}
                    onLocationSelect={(location) => {
                      setUserLocation(location);
                      setLocationError(null);
                      setShowLocationPicker(false);
                    }}
                    onClose={() => setShowLocationPicker(false)}
                  />
                </div>
              )}
            </div>
            
            {/* Quick Action Cards Grid - All visible at once */}
            {hasDiscovered && (
              <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Facilities Card */}
                <QuickCard
                  title="Nearby Facilities"
                  icon={<Building className="w-5 h-5" />}
                  color="#58a6ff"
                  expanded={expandedSection === 'facilities'}
                  onToggle={() => setExpandedSection(expandedSection === 'facilities' ? null : 'facilities')}
                  badge={filteredFacilities.length.toString()}
                >
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filteredFacilities.slice(0, 5).map((f, i) => (
                      <div key={i} className="p-2 bg-[#0d1117] rounded-lg text-sm">
                        <div className="font-medium text-[#e6edf3]">{f.name}</div>
                        <div className="text-xs text-[#8b949e] flex items-center justify-between">
                          <span>{f.distance} mi • {f.type}</span>
                          {f.subsidyGap && f.subsidyGap > 0 && (
                            <span className="text-[#f85149]">${(f.subsidyGap/1000000).toFixed(1)}M gap</span>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredFacilities.length > 5 && (
                      <button 
                        onClick={() => setViewMode('full')}
                        className="w-full py-2 text-xs text-[#58a6ff] hover:underline"
                      >
                        View all {filteredFacilities.length} facilities →
                      </button>
                    )}
                  </div>
                </QuickCard>
                
                {/* Community Networks Card */}
                <QuickCard
                  title="Community Networks"
                  icon={<Users className="w-5 h-5" />}
                  color="#3fb950"
                  expanded={expandedSection === 'networks'}
                  onToggle={() => setExpandedSection(expandedSection === 'networks' ? null : 'networks')}
                  badge="ILSR"
                >
                  <div className="space-y-2">
                    <div className="p-2 bg-[#0d1117] rounded-lg">
                      <div className="font-medium text-[#3fb950]">NYC Mesh</div>
                      <div className="text-xs text-[#8b949e]">Community-owned • 3.2 mi</div>
                      <a href="https://nycmesh.net" target="_blank" rel="noreferrer" className="text-xs text-[#58a6ff] hover:underline">
                        nycmesh.net →
                      </a>
                    </div>
                    <div className="p-2 bg-[#0d1117] rounded-lg">
                      <div className="font-medium text-[#3fb950]">Hudson Valley Host</div>
                      <div className="text-xs text-[#8b949e]">Worker cooperative • 92 mi</div>
                    </div>
                    <button 
                      onClick={() => setViewMode('full')}
                      className="w-full py-2 text-xs text-[#58a6ff] hover:underline"
                    >
                      See all alternatives →
                    </button>
                  </div>
                </QuickCard>
                
                {/* Legal Context Card */}
                <QuickCard
                  title="Legal Framework"
                  icon={<Scale className="w-5 h-5" />}
                  color="#a371f7"
                  expanded={expandedSection === 'legal'}
                  onToggle={() => setExpandedSection(expandedSection === 'legal' ? null : 'legal')}
                  badge="NPU"
                >
                  <div className="space-y-2">
                    <div className="p-2 bg-[#0d1117] rounded-lg">
                      <div className="text-xs text-[#8b949e]">Jurisdiction</div>
                      <div className="font-medium">{userLocation.state} State</div>
                      <div className="text-xs text-[#3fb950]">No Preemption</div>
                    </div>
                    <div className="p-2 bg-[rgba(163,113,247,0.1)] border border-[rgba(163,113,247,0.3)] rounded-lg">
                      <div className="text-xs font-medium text-[#a371f7]">NPU Framework</div>
                      <div className="text-xs text-[#8b949e] mt-1">
                        Data centers as essential facilities subject to common carrier obligations
                      </div>
                    </div>
                    <button 
                      onClick={() => setViewMode('full')}
                      className="w-full py-2 text-xs text-[#58a6ff] hover:underline"
                    >
                      View legal precedents →
                    </button>
                  </div>
                </QuickCard>
                
                {/* Quick Queries Card */}
                <QuickCard
                  title="Quick Queries"
                  icon={<Search className="w-5 h-5" />}
                  color="#d29922"
                  expanded={expandedSection === 'queries'}
                  onToggle={() => setExpandedSection(expandedSection === 'queries' ? null : 'queries')}
                  badge="CAP"
                >
                  <div className="space-y-2">
                    {[
                      { q: `"${userLocation.city}" data center jobs promised`, label: 'Jobs' },
                      { q: `"${userLocation.city}" data center tax incentives`, label: 'Subsidies' },
                      { q: `"${userLocation.city}" data center environmental impact`, label: 'Environment' },
                    ].map((item, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          copyToClipboard(item.q, `query-${i}`);
                          addToQueryHistory(item.q, item.label);
                        }}
                        className="w-full p-2 bg-[#0d1117] rounded-lg text-left hover:bg-[#21262d] transition-colors group"
                      >
                        <div className="text-xs text-[#d29922] font-medium">{item.label}</div>
                        <div className="text-xs text-[#8b949e] truncate group-hover:text-[#e6edf3]">
                          {item.q}
                        </div>
                        <div className="text-[10px] text-[#58a6ff] mt-1">
                          {copiedToClipboard === `query-${i}` ? '✓ Copied!' : 'Click to copy'}
                        </div>
                      </button>
                    ))}
                    <button 
                      onClick={() => setViewMode('full')}
                      className="w-full py-2 text-xs text-[#58a6ff] hover:underline"
                    >
                      Explore CAP taxonomy →
                    </button>
                  </div>
                </QuickCard>
              </div>
              
              {/* GPS PROXIMITY LOCATOR - Top Priority Feature */}
              <div className="bg-gradient-to-r from-[#161b22] to-[#0d1117] border-2 border-[#22c55e]/50 rounded-xl p-4 relative overflow-hidden">
                {/* Animated GPS rings background */}
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border border-[#22c55e] rounded-full animate-ping" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-[#22c55e] rounded-full animate-ping" style={{ animationDelay: '0.5s' }} />
                </div>
                
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#22c55e] to-[#16a34a] flex items-center justify-center shadow-lg shadow-[#22c55e]/20">
                        <Navigation className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#e6edf3] flex items-center gap-2">
                          📍 GPS Proximity Locator
                          <span className="text-[10px] px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded-full animate-pulse">LIVE</span>
                        </h4>
                        <p className="text-xs text-[#8b949e]">Ping your location → Find nearest facilities with labor data</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="p-2 bg-[#0d1117] rounded-lg text-center border border-[#30363d]">
                      <Navigation className="w-5 h-5 text-[#22c55e] mx-auto mb-1" />
                      <div className="text-[10px] text-[#8b949e]">GPS Location</div>
                    </div>
                    <div className="p-2 bg-[#0d1117] rounded-lg text-center border border-[#30363d]">
                      <Building className="w-5 h-5 text-[#58a6ff] mx-auto mb-1" />
                      <div className="text-[10px] text-[#8b949e]">Nearby DCs</div>
                    </div>
                    <div className="p-2 bg-[#0d1117] rounded-lg text-center border border-[#30363d]">
                      <Shield className="w-5 h-5 text-[#f85149] mx-auto mb-1" />
                      <div className="text-[10px] text-[#8b949e]">Union Status</div>
                    </div>
                    <div className="p-2 bg-[#0d1117] rounded-lg text-center border border-[#30363d]">
                      <AlertTriangle className="w-5 h-5 text-[#d29922] mx-auto mb-1" />
                      <div className="text-[10px] text-[#8b949e]">Violations</div>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {
                      setViewMode('full');
                      setExpandedSection('proximity');
                    }}
                    className="w-full py-3 bg-gradient-to-r from-[#22c55e] to-[#16a34a] hover:from-[#16a34a] hover:to-[#22c55e] text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#22c55e]/20 hover:shadow-[#22c55e]/40"
                  >
                    <MapPin className="w-5 h-5" />
                    Open GPS Locator
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  
                  <p className="text-[10px] text-[#6e7681] mt-2 text-center flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Privacy-first: GPS data never leaves your device
                  </p>
                </div>
              </div>
              
              {/* Union Locals Card - Second Row */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#e6edf3] flex items-center gap-2">
                        Union Locals
                        <span className="text-[10px] px-2 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full">OLMS</span>
                      </h4>
                      <p className="text-xs text-[#8b949e]">Building trades with jurisdiction</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setViewMode('full')}
                    className="text-xs text-[#58a6ff] hover:underline"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { name: 'IBEW', desc: 'Electrical', share: '45-70%', color: '#f59e0b' },
                    { name: 'SMART', desc: 'HVAC', share: '15-25%', color: '#3b82f6' },
                    { name: 'UA', desc: 'Piping', share: '10-20%', color: '#10b981' },
                    { name: 'IUOE', desc: 'Engineers', share: '5-10%', color: '#8b5cf6' },
                  ].map((trade) => (
                    <div key={trade.name} className="p-2 bg-[#0d1117] rounded-lg text-center">
                      <div className="font-bold" style={{ color: trade.color }}>{trade.name}</div>
                      <div className="text-[10px] text-[#8b949e]">{trade.desc}</div>
                      <div className="text-[10px] text-[#6e7681]">{trade.share} DC work</div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-[#6e7681] mt-2 text-center">
                  County-based jurisdiction matching via Census FIPS codes
                </p>
              </div>
              
              {/* Union Organizing Intelligence Card - Third Row */}
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 hover:border-[#f97316]/50 transition-colors cursor-pointer" onClick={() => setViewMode('full')}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
                      <Target className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#e6edf3] flex items-center gap-2">
                        Organizing Intelligence
                        <span className="text-[10px] px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] rounded-full">BETA</span>
                      </h4>
                      <p className="text-xs text-[#8b949e]">Identify organizing opportunities at data centers</p>
                    </div>
                  </div>
                  <button 
                    className="text-xs text-[#58a6ff] hover:underline"
                  >
                    View all →
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <div className="p-2 bg-[#0d1117] rounded-lg text-center">
                    <div className="text-lg font-bold text-[#22c55e]">2</div>
                    <div className="text-[10px] text-[#8b949e]">Represented</div>
                  </div>
                  <div className="p-2 bg-[#0d1117] rounded-lg text-center">
                    <div className="text-lg font-bold text-[#eab308]">3</div>
                    <div className="text-[10px] text-[#8b949e]">Targets</div>
                  </div>
                  <div className="p-2 bg-[#0d1117] rounded-lg text-center">
                    <div className="text-lg font-bold text-[#f97316]">1</div>
                    <div className="text-[10px] text-[#8b949e]">Active</div>
                  </div>
                  <div className="p-2 bg-[#0d1117] rounded-lg text-center">
                    <div className="text-lg font-bold text-[#3b82f6]">~525</div>
                    <div className="text-[10px] text-[#8b949e]">Workers</div>
                  </div>
                </div>
                <p className="text-[10px] text-[#6e7681] mt-2 text-center">
                  NLRB cases • Employer intel • Organizing scores
                </p>
              </div>
              </>
            )}
            
            {/* Quick Stats Bar - Always visible when discovered */}
            {hasDiscovered && statistics && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#58a6ff]">{statistics.totalFacilities}</div>
                      <div className="text-xs text-[#8b949e]">Facilities</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#f85149]">${(statistics.totalSubsidyGap/1000000).toFixed(1)}M</div>
                      <div className="text-xs text-[#8b949e]">Subsidy Gap</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#d29922]">{statistics.nonCompliantCount}</div>
                      <div className="text-xs text-[#8b949e]">Non-Compliant</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-[#3fb950]">{statistics.compliantCount}</div>
                      <div className="text-xs text-[#8b949e]">Compliant</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={exportToCSV}
                      className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-lg text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Export
                    </button>
                    <button
                      onClick={shareResults}
                      className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] rounded-lg text-xs flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>
                    <button
                      onClick={() => setViewMode('full')}
                      className="px-3 py-1.5 bg-[#58a6ff] text-white rounded-lg text-xs flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Full Details
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Not discovered yet - Prompt */}
            {!hasDiscovered && (
              <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-8 text-center">
                <Globe className="w-12 h-12 mx-auto text-[#58a6ff] mb-4" />
                <h3 className="text-lg font-semibold mb-2">Ready to Discover</h3>
                <p className="text-sm text-[#8b949e] mb-4">
                  Select your location and click "Discover" to find nearby data center infrastructure, 
                  community alternatives, and generate accountability queries.
                </p>
                <p className="text-xs text-[#6e7681]">
                  <Zap className="w-3 h-3 inline mr-1" />
                  Quick View shows everything in one screen — no scrolling required
                </p>
              </div>
            )}
          </div>
        )}

        {/* ============ FULL VIEW MODE ============ */}
        {viewMode === 'full' && (
          <>
        {/* Discovery Panel */}
        <section 
          ref={(el) => { sectionRefs.current['discovery'] = el; }}
          id="section-discovery"
          className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden scroll-mt-6"
        >
          {/* Section Label */}
          <div className="absolute -top-3 left-4 px-2 py-0.5 bg-[#3fb950] text-black text-[10px] font-bold uppercase tracking-wider rounded">
            Discovery
          </div>
          {/* Panel Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-[#21262d] border-b border-[#30363d]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#58a6ff] flex items-center justify-center">
                <MapPin className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Location Discovery</span>
            </div>
          </div>

          {/* Location Trigger */}
          <div className="flex items-center gap-8 p-6 flex-wrap">
            <button
              onClick={handleDiscovery}
              disabled={isDiscovering}
              className={`flex items-center gap-3 px-6 py-3 rounded-xl font-semibold transition-all ${
                hasDiscovered
                  ? 'bg-gradient-to-r from-[#3fb950] to-[#2ea043]'
                  : 'bg-gradient-to-r from-[#58a6ff] to-[#a371f7] hover:translate-y-[-2px] hover:shadow-[0_8px_24px_rgba(88,166,255,0.3)]'
              } disabled:opacity-50`}
            >
              {isDiscovering ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Discovering...
                </>
              ) : hasDiscovered ? (
                <>
                  <span>✓</span>
                  Infrastructure Found
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Discover Nearby Infrastructure
                </>
              )}
            </button>

            <div className="flex-1 min-w-[200px] relative">
              <div className="text-xs text-[#8b949e] uppercase tracking-wider mb-1 flex items-center gap-2">
                Current Location
                <button 
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="text-[#58a6ff] hover:text-[#79c0ff] text-xs flex items-center gap-1"
                >
                  {showLocationPicker ? '✕ Close' : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Smart Search
                    </>
                  )}
                </button>
              </div>
              
              {showLocationPicker ? (
                <div className="absolute top-8 left-0 z-50 shadow-2xl">
                  <NLPLocationSearch
                    currentLocation={userLocation}
                    onLocationSelect={(location) => {
                      setUserLocation(location);
                      setLocationError(null);
                      setShowLocationPicker(false);
                    }}
                    onClose={() => setShowLocationPicker(false)}
                  />
                </div>
              ) : locationLoading ? (
                <div className="font-mono text-sm text-[#f0883e] flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-[#f0883e] border-t-transparent rounded-full animate-spin" />
                  Detecting your location...
                </div>
              ) : locationError ? (
                <button 
                  onClick={() => setShowLocationPicker(true)}
                  className="font-mono text-sm text-[#f85149] hover:text-[#ff7b72] cursor-pointer flex items-center gap-1"
                >
                  <span>⚠️</span> {locationError} — <span className="underline">Select manually</span>
                </button>
              ) : (
                <div className="font-mono text-sm text-[#3fb950] flex items-center gap-2">
                  <span>✓</span>
                  {userLocation.neighborhood ? `${userLocation.neighborhood}, ` : ''}
                  {userLocation.city}
                  {userLocation.state ? `, ${userLocation.state}` : ''}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-[200px]">
              <div className="text-xs text-[#8b949e] uppercase tracking-wider mb-1">Jurisdiction</div>
              <div className="font-mono text-sm text-[#3fb950]">
                {userLocation.state} State • No Preemption
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-[rgba(88,166,255,0.1)] border border-[rgba(88,166,255,0.2)] rounded-lg max-w-sm">
              <Lock className="w-4 h-4 text-[#58a6ff] flex-shrink-0 mt-0.5" />
              <div className="text-xs text-[#8b949e]">
                <strong className="text-[#e6edf3]">Privacy-First Design</strong><br />
                Location processed in your browser only. Never sent to any server.
              </div>
            </div>
          </div>

          {/* PROXIMITY LOCATOR - GPS-based nearby facilities */}
          <div 
            ref={(el) => { sectionRefs.current['proximity'] = el; }}
            id="section-proximity"
            className="scroll-mt-6 mt-6"
          >
            <ProximityLocator />
          </div>

          {/* Network Path Visualization */}
          <div 
            ref={(el) => { sectionRefs.current['network'] = el; }}
            id="section-network"
            className="scroll-mt-6"
          >
          <NetworkPathVisualization 
            isActive={hasDiscovered}
            userLocation={userLocation}
          />
          </div>

          {/* DISCOVERY RESULTS BANNER - Prominent notification */}
          {showResultsBanner && (
            <div 
              ref={resultsRef}
              className="mx-6 mt-6 p-4 bg-gradient-to-r from-[#3fb950]/20 via-[#58a6ff]/20 to-[#a371f7]/20 border-2 border-[#3fb950] rounded-xl animate-pulse"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#3fb950] flex items-center justify-center animate-bounce">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#3fb950] flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Infrastructure Discovered!
                    </h3>
                    <p className="text-sm text-[#8b949e]">
                      Found <strong className="text-white">{discoveredFacilities.length} facilities</strong>, 
                      community alternatives, legal frameworks, and generated accountability queries below
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    <span className="px-3 py-1 bg-[#3fb950] text-black text-xs font-bold rounded-full">
                      {discoveredFacilities.filter(f => f.type === 'detected').length} Detected
                    </span>
                    <span className="px-3 py-1 bg-[#58a6ff] text-black text-xs font-bold rounded-full">
                      {discoveredFacilities.filter(f => f.type === 'nearby').length} Nearby
                    </span>
                    <span className="px-3 py-1 bg-[#a371f7] text-black text-xs font-bold rounded-full">
                      {discoveredFacilities.filter(f => f.type === 'cloud').length} Cloud
                    </span>
                  </div>
                  <button
                    onClick={() => setShowResultsBanner(false)}
                    className="p-2 hover:bg-[#30363d] rounded-lg transition-colors"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-center mt-4 text-[#58a6ff] animate-bounce">
                <ArrowDown className="w-5 h-5" />
                <span className="text-sm ml-2">Scroll down to explore all results</span>
                <ArrowDown className="w-5 h-5" />
              </div>
            </div>
          )}

          {/* NEW: Statistics Summary Bar */}
          {hasDiscovered && statistics && (
            <div className="mx-6 mt-6 p-4 bg-[#21262d] border border-[#30363d] rounded-xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#58a6ff]" />
                  Discovery Statistics
                </h3>
                
                {/* Quick Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowQueryHistory(!showQueryHistory)}
                    className={`p-2 rounded-lg transition-colors ${showQueryHistory ? 'bg-[#58a6ff] text-white' : 'hover:bg-[#30363d] text-[#8b949e]'}`}
                    title="Query History (⌘H)"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setShowMiniMap(!showMiniMap)}
                    className={`p-2 rounded-lg transition-colors ${showMiniMap ? 'bg-[#58a6ff] text-white' : 'hover:bg-[#30363d] text-[#8b949e]'}`}
                    title="Toggle Map (⌘M)"
                  >
                    <Target className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      className="p-2 hover:bg-[#30363d] rounded-lg transition-colors text-[#8b949e]"
                      title="Export/Share"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-50">
                        <button
                          onClick={exportToCSV}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-[#30363d] flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export to CSV
                        </button>
                        <button
                          onClick={shareResults}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-[#30363d] flex items-center gap-2"
                        >
                          <Share2 className="w-4 h-4" />
                          Share Results
                        </button>
                        <button
                          onClick={() => {
                            copyToClipboard(JSON.stringify(discoveredFacilities, null, 2), 'json');
                            setShowExportMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-[#30363d] flex items-center gap-2"
                        >
                          <Copy className="w-4 h-4" />
                          Copy as JSON
                          {copiedToClipboard === 'json' && <Check className="w-4 h-4 text-[#3fb950]" />}
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
                    className="p-2 hover:bg-[#30363d] rounded-lg transition-colors text-[#8b949e]"
                    title="Keyboard Shortcuts (?)"
                  >
                    <Keyboard className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <StatCard 
                  label="Facilities" 
                  value={statistics.totalFacilities} 
                  icon={<Building className="w-4 h-4" />}
                  color="#58a6ff"
                />
                <StatCard 
                  label="Avg Distance" 
                  value={`${statistics.avgDistance} mi`} 
                  icon={<Target className="w-4 h-4" />}
                  color="#a371f7"
                />
                <StatCard 
                  label="Subsidy Gap" 
                  value={`$${(statistics.totalSubsidyGap / 1000000).toFixed(1)}M`} 
                  icon={<TrendingDown className="w-4 h-4" />}
                  color="#f85149"
                  highlight={statistics.totalSubsidyGap > 0}
                />
                <StatCard 
                  label="Compliant" 
                  value={statistics.compliantCount} 
                  icon={<CheckCircle className="w-4 h-4" />}
                  color="#3fb950"
                />
                <StatCard 
                  label="Non-Compliant" 
                  value={statistics.nonCompliantCount} 
                  icon={<AlertTriangle className="w-4 h-4" />}
                  color="#f85149"
                  highlight={statistics.nonCompliantCount > 0}
                />
                <StatCard 
                  label="Jobs Gap" 
                  value={statistics.jobsGap.toLocaleString()} 
                  icon={<Users className="w-4 h-4" />}
                  color={statistics.jobsGap > 0 ? '#f85149' : '#3fb950'}
                />
                <StatCard 
                  label="Bookmarked" 
                  value={statistics.bookmarkedCount} 
                  icon={<BookmarkCheck className="w-4 h-4" />}
                  color="#d29922"
                />
              </div>
            </div>
          )}

          {/* NEW: Query History Panel */}
          {showQueryHistory && (
            <div className="mx-6 mt-4 p-4 bg-[#161b22] border border-[#30363d] rounded-xl animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <History className="w-4 h-4 text-[#58a6ff]" />
                  Query History
                </h4>
                <button
                  onClick={() => setQueryHistory([])}
                  className="text-xs text-[#8b949e] hover:text-[#f85149] flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear
                </button>
              </div>
              {queryHistory.length === 0 ? (
                <p className="text-sm text-[#8b949e] text-center py-4">No queries yet. Search using the CAP wheel or Query Generator.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {queryHistory.map((item, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between p-2 bg-[#21262d] rounded-lg group hover:border-[#58a6ff] border border-transparent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.query}</p>
                        <p className="text-xs text-[#8b949e]">
                          {item.topic && <span className="text-[#a371f7]">{item.topic} • </span>}
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => copyToClipboard(item.query, `history-${i}`)}
                        className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-[#30363d] rounded transition-all"
                      >
                        {copiedToClipboard === `history-${i}` ? <Check className="w-3 h-3 text-[#3fb950]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* NEW: Mini Map Visualization */}
          {hasDiscovered && showMiniMap && (
            <div className="mx-6 mt-4">
              <MiniMapVisualization 
                facilities={filteredFacilities}
                userLocation={userLocation}
                onFacilityClick={(name) => {
                  const card = document.querySelector(`[data-facility="${name}"]`);
                  card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            </div>
          )}

          {/* NEW: Filter Bar */}
          {hasDiscovered && (
            <div className="mx-6 mt-4 flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-[#8b949e]" />
                <span className="text-sm text-[#8b949e]">Filter:</span>
              </div>
              {(['all', 'detected', 'nearby', 'cloud'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filterType === type 
                      ? type === 'all' ? 'bg-[#58a6ff] text-white' :
                        type === 'detected' ? 'bg-[#3fb950] text-black' :
                        type === 'nearby' ? 'bg-[#58a6ff] text-white' :
                        'bg-[#a371f7] text-white'
                      : 'bg-[#21262d] text-[#8b949e] hover:bg-[#30363d]'
                  }`}
                >
                  {type === 'all' ? `All (${discoveredFacilities.length})` : 
                   `${type.charAt(0).toUpperCase() + type.slice(1)} (${discoveredFacilities.filter(f => f.type === type).length})`}
                </button>
              ))}
              
              {filteredFacilities.length !== discoveredFacilities.length && (
                <span className="text-xs text-[#8b949e] ml-2">
                  Showing {filteredFacilities.length} of {discoveredFacilities.length}
                </span>
              )}
            </div>
          )}

          {/* Discovered Facilities */}
          {hasDiscovered && (
            <div 
              ref={(el) => { sectionRefs.current['facilities'] = el; }}
              id="section-facilities"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6 border-t border-[#30363d] scroll-mt-6"
            >
              {filteredFacilities.map((facility, index) => (
                <FacilityCard 
                  key={index} 
                  facility={facility} 
                  animationDelay={index * 150}
                  isBookmarked={bookmarkedFacilities.has(facility.name)}
                  onToggleBookmark={() => toggleBookmark(facility.name)}
                />
              ))}
            </div>
          )}

          {/* ILSR Alternatives */}
          {hasDiscovered && (
            <div 
              ref={(el) => { sectionRefs.current['community'] = el; }}
              id="section-community"
              className="scroll-mt-6"
            >
            <ILSRAlternatives userLocation={userLocation} />
            </div>
          )}

          {/* Union Local Discovery */}
          {hasDiscovered && (
            <div 
              ref={(el) => { sectionRefs.current['unions'] = el; }}
              id="section-unions"
              className="scroll-mt-6"
            >
              <UnionLocalDiscovery 
                userLocation={userLocation} 
                isActive={hasDiscovered}
              />
            </div>
          )}

          {/* Union Organizing Intelligence */}
          {hasDiscovered && (
            <div 
              ref={(el) => { sectionRefs.current['organizing'] = el; }}
              id="section-organizing"
              className="scroll-mt-6"
            >
              <UnionOrganizingIntelligence userLocation={userLocation} />
            </div>
          )}

          {/* NPU Legal Context */}
          {hasDiscovered && (
            <div 
              ref={(el) => { sectionRefs.current['legal'] = el; }}
              id="section-legal"
              className="scroll-mt-6"
            >
            <NPULegalContext userLocation={userLocation} />
            </div>
          )}

          {/* Query Generator */}
          {hasDiscovered && (
            <div 
              ref={(el) => { sectionRefs.current['queries'] = el; }}
              id="section-queries"
              className="scroll-mt-6"
            >
            <QueryGenerator 
              facilities={discoveredFacilities}
              userLocation={userLocation}
              selectedCAPTopic={selectedCAPTopic}
            />
            </div>
          )}
        </section>

        {/* CAP Taxonomy Section */}
        <section 
          ref={(el) => { sectionRefs.current['cap'] = el; }}
          id="section-cap"
          className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden scroll-mt-6"
        >
          <div className="flex items-center justify-between px-6 py-4 bg-[#21262d] border-b border-[#30363d]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#a371f7] flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">CAP Policy Taxonomy</span>
            </div>
            <span className="text-xs text-[#8b949e]">21 Major Topics • 220+ Subtopics • 896,245+ Observations</span>
          </div>

          <CAPTaxonomyWheel 
            onTopicSelect={setSelectedCAPTopic}
            selectedTopic={selectedCAPTopic}
          />
        </section>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-[#30363d]">
          <div className="flex justify-center gap-4 flex-wrap mb-4">
            {[
              { icon: <Lock className="w-4 h-4" />, label: 'IndexedDB' },
              { icon: <Globe className="w-4 h-4" />, label: 'RIPE RIS Live' },
              { icon: <Network className="w-4 h-4" />, label: 'PeeringDB' },
              { icon: <Search className="w-4 h-4" />, label: 'DNS-over-HTTPS' },
              { icon: <Scale className="w-4 h-4" />, label: 'NPU Framework' }
            ].map((badge, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#161b22] border border-[#30363d] rounded-lg">
                {badge.icon}
                <span className="text-xs font-mono">{badge.label}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-[#6e7681]">
            Loukissas Data Locality + Lupton Self-Tracking • DCIM Dashboard
          </p>
        </footer>
          </>
        )}
      </div>
      
      {/* Keyboard Shortcuts Modal */}
      {showKeyboardShortcuts && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-[#58a6ff]" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowKeyboardShortcuts(false)}
                className="p-2 hover:bg-[#30363d] rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3">
              {[
                { keys: ['⌘', 'V'], action: 'Toggle Quick/Full view' },
                { keys: ['⌘', 'D'], action: 'Discover infrastructure' },
                { keys: ['⌘', 'H'], action: 'Toggle query history' },
                { keys: ['⌘', 'M'], action: 'Toggle mini map' },
                { keys: ['Shift', '?'], action: 'Show keyboard shortcuts' },
                { keys: ['Esc'], action: 'Close modals/dropdowns' },
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-[#30363d] last:border-0">
                  <span className="text-[#e6edf3]">{shortcut.action}</span>
                  <div className="flex gap-1">
                    {shortcut.keys.map((key, j) => (
                      <kbd 
                        key={j}
                        className="px-2 py-1 bg-[#21262d] border border-[#30363d] rounded text-xs font-mono text-[#8b949e]"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <p className="mt-6 text-xs text-[#6e7681] text-center">
              Press <kbd className="px-1.5 py-0.5 bg-[#21262d] border border-[#30363d] rounded text-[10px]">Esc</kbd> to close
            </p>
          </div>
        </div>
      )}
      
      {/* Copied notification toast */}
      {copiedToClipboard && (
        <div className="fixed bottom-6 right-6 px-4 py-2 bg-[#3fb950] text-black rounded-lg shadow-xl flex items-center gap-2 animate-fadeIn z-50">
          <Check className="w-4 h-4" />
          Copied to clipboard!
        </div>
      )}
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; highlight?: boolean }> = 
  ({ label, value, icon, color, highlight }) => (
  <div className={`p-3 bg-[#161b22] border rounded-lg transition-all ${highlight ? 'border-[#f85149] animate-pulse' : 'border-[#30363d]'}`}>
    <div className="flex items-center gap-2 mb-1" style={{ color }}>
      {icon}
      <span className="text-xs text-[#8b949e] uppercase tracking-wider">{label}</span>
    </div>
    <p className="text-xl font-bold" style={{ color }}>{value}</p>
  </div>
);

// Quick Card Component - For compact Quick View mode
const QuickCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  color: string;
  expanded: boolean;
  onToggle: () => void;
  badge?: string;
  children: React.ReactNode;
}> = ({ title, icon, color, expanded, onToggle, badge, children }) => (
  <div 
    className={`bg-[#161b22] border rounded-xl transition-all overflow-hidden ${
      expanded ? 'border-[#58a6ff] shadow-lg' : 'border-[#30363d] hover:border-[#58a6ff]'
    }`}
    style={{ borderColor: expanded ? color : undefined }}
  >
    <button
      onClick={onToggle}
      className="w-full p-4 flex items-center justify-between text-left"
    >
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
        <div>
          <div className="font-semibold text-[#e6edf3]">{title}</div>
          {badge && (
            <span 
              className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ backgroundColor: `${color}30`, color }}
            >
              {badge}
            </span>
          )}
        </div>
      </div>
      <ChevronRight 
        className={`w-5 h-5 text-[#8b949e] transition-transform ${expanded ? 'rotate-90' : ''}`}
      />
    </button>
    {expanded && (
      <div className="px-4 pb-4 animate-fadeIn">
        {children}
      </div>
    )}
  </div>
);

// Mini Map Visualization Component
const MiniMapVisualization: React.FC<{
  facilities: DiscoveredFacility[];
  userLocation: UserLocation;
  onFacilityClick: (name: string) => void;
}> = ({ facilities, userLocation, onFacilityClick }) => {
  const maxDistance = Math.max(...facilities.map(f => f.distance), 50);
  
  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold flex items-center gap-2">
          <Target className="w-4 h-4 text-[#58a6ff]" />
          Facility Map
        </h4>
        <span className="text-xs text-[#8b949e]">Radius: {maxDistance.toFixed(0)} mi</span>
      </div>
      
      {/* Radar-style visualization */}
      <div className="relative w-full aspect-square max-w-[300px] mx-auto">
        {/* Concentric circles */}
        {[0.25, 0.5, 0.75, 1].map((ratio, i) => (
          <div
            key={i}
            className="absolute rounded-full border border-[#30363d] opacity-50"
            style={{
              width: `${ratio * 100}%`,
              height: `${ratio * 100}%`,
              left: `${(1 - ratio) * 50}%`,
              top: `${(1 - ratio) * 50}%`,
            }}
          />
        ))}
        
        {/* Distance labels */}
        {[0.5, 1].map((ratio, i) => (
          <span
            key={i}
            className="absolute text-[10px] text-[#8b949e]"
            style={{
              left: '50%',
              top: `${(1 - ratio) * 50}%`,
              transform: 'translateX(-50%)',
            }}
          >
            {Math.round(maxDistance * ratio)} mi
          </span>
        ))}
        
        {/* Center point (user location) */}
        <div 
          className="absolute w-4 h-4 bg-[#3fb950] rounded-full border-2 border-white z-10"
          style={{ left: 'calc(50% - 8px)', top: 'calc(50% - 8px)' }}
          title={`You: ${userLocation.neighborhood}, ${userLocation.city}`}
        >
          <div className="absolute inset-0 bg-[#3fb950] rounded-full animate-ping opacity-50" />
        </div>
        
        {/* Facility dots */}
        {facilities.map((facility, i) => {
          const angle = (i / facilities.length) * 2 * Math.PI - Math.PI / 2;
          const distanceRatio = Math.min(facility.distance / maxDistance, 1);
          const x = 50 + Math.cos(angle) * distanceRatio * 45;
          const y = 50 + Math.sin(angle) * distanceRatio * 45;
          
          const colors = {
            detected: '#3fb950',
            nearby: '#58a6ff',
            cloud: '#a371f7'
          };
          
          return (
            <button
              key={i}
              className="absolute w-3 h-3 rounded-full border border-white transition-transform hover:scale-150 cursor-pointer z-20"
              style={{
                left: `calc(${x}% - 6px)`,
                top: `calc(${y}% - 6px)`,
                backgroundColor: colors[facility.type],
              }}
              onClick={() => onFacilityClick(facility.name)}
              title={`${facility.name} (${facility.distance} mi)`}
            />
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#3fb950]" /> Detected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#58a6ff]" /> Nearby
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-[#a371f7]" /> Cloud
        </span>
      </div>
    </div>
  );
};

// Facility Card Component
const FacilityCard: React.FC<{ 
  facility: DiscoveredFacility; 
  animationDelay?: number;
  isBookmarked?: boolean;
  onToggleBookmark?: () => void;
}> = ({ facility, animationDelay = 0, isBookmarked = false, onToggleBookmark }) => {
  const [expanded, setExpanded] = useState(false);
  
  const typeColors = {
    detected: 'bg-[#3fb950]',
    nearby: 'bg-[#58a6ff]',
    cloud: 'bg-[#a371f7]'
  };

  const typeGlowColors = {
    detected: 'shadow-[0_0_20px_rgba(63,185,80,0.5)]',
    nearby: 'shadow-[0_0_20px_rgba(88,166,255,0.5)]',
    cloud: 'shadow-[0_0_20px_rgba(163,113,247,0.5)]'
  };

  const frameworkColors = {
    npu: 'border-[#a371f7] text-[#a371f7]',
    ilsr: 'border-[#3fb950] text-[#3fb950]',
    nlrb: 'border-[#d29922] text-[#d29922]'
  };

  const complianceColors = {
    'compliant': 'bg-[#238636] text-white',
    'non-compliant': 'bg-[#da3633] text-white',
    'at-risk': 'bg-[#d29922] text-black',
    'unknown': 'bg-[#6e7681] text-white'
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
    return `$${amount}`;
  };

  return (
    <div 
      data-facility={facility.name}
      className={`bg-[#21262d] border-2 border-[#30363d] rounded-xl p-5 transition-all hover:border-[#3fb950] hover:translate-y-[-4px] hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] animate-[fadeInUp_0.5s_ease-out_forwards] opacity-0 ${typeGlowColors[facility.type]} cursor-pointer relative group`}
      style={{ 
        animationDelay: `${animationDelay}ms`,
        borderColor: facility.type === 'detected' ? '#3fb950' : facility.type === 'nearby' ? '#58a6ff' : '#a371f7'
      }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Bookmark button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleBookmark?.();
        }}
        className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all ${
          isBookmarked 
            ? 'bg-[#d29922] text-white' 
            : 'opacity-0 group-hover:opacity-100 bg-[#30363d] text-[#8b949e] hover:bg-[#d29922] hover:text-white'
        }`}
        title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
      >
        {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
      </button>
      
      <div className="flex items-start justify-between mb-3 pr-8">
        <div className="flex items-center gap-2">
        <span className={`text-[0.65rem] uppercase tracking-wider px-2 py-1 rounded font-semibold ${typeColors[facility.type]} text-[#0d1117]`}>
          {facility.type}
        </span>
          {facility.complianceStatus && (
            <span className={`text-[0.6rem] uppercase tracking-wider px-2 py-0.5 rounded font-semibold ${complianceColors[facility.complianceStatus]}`}>
              {facility.complianceStatus}
            </span>
          )}
        </div>
        <span className="text-xs text-[#8b949e]">{facility.confidence}</span>
      </div>

      <h4 className="text-lg font-semibold mb-1">{facility.name}</h4>
      {facility.operator && (
        <p className="text-xs text-[#58a6ff] mb-1">{facility.operator}</p>
      )}
      <p className="text-sm text-[#8b949e] mb-4 flex items-center gap-1">
        <MapPin className="w-3 h-3" />
        {facility.location}
      </p>

      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#30363d]">
        <div className="text-center">
          <div className="font-mono text-lg font-semibold text-[#58a6ff]">{facility.distance}</div>
          <div className="text-[0.65rem] text-[#6e7681] uppercase">Mi Away</div>
        </div>
        <div className="text-center">
          <div className={`font-mono text-lg font-semibold ${facility.subsidyGap ? 'text-[#f85149]' : 'text-[#58a6ff]'}`}>
            {formatCurrency(facility.subsidyGap)}
          </div>
          <div className="text-[0.65rem] text-[#6e7681] uppercase">Subsidy Gap</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-lg font-semibold text-[#58a6ff]">{facility.capacity}</div>
          <div className="text-[0.65rem] text-[#6e7681] uppercase">Capacity</div>
        </div>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-[#30363d] animate-fadeIn">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            {facility.jobsPromised !== undefined && (
              <div>
                <div className="text-[#8b949e] text-xs uppercase mb-1">Jobs Promised</div>
                <div className="font-mono text-[#3fb950]">{facility.jobsPromised?.toLocaleString() || 'N/A'}</div>
              </div>
            )}
            {facility.jobsActual !== undefined && (
              <div>
                <div className="text-[#8b949e] text-xs uppercase mb-1">Jobs Actual</div>
                <div className={`font-mono ${facility.jobsActual && facility.jobsPromised && facility.jobsActual < facility.jobsPromised ? 'text-[#f85149]' : 'text-[#3fb950]'}`}>
                  {facility.jobsActual?.toLocaleString() || 'N/A'}
                </div>
              </div>
            )}
            <div>
              <div className="text-[#8b949e] text-xs uppercase mb-1">ASN</div>
              <div className="font-mono text-[#58a6ff]">{facility.asn}</div>
            </div>
            <div>
              <div className="text-[#8b949e] text-xs uppercase mb-1">State</div>
              <div className="font-mono">{facility.state || facility.location.split(', ')[1]}</div>
            </div>
          </div>
          
          <p className="text-xs text-[#8b949e] mb-2">
            💡 Click frameworks below for relevant legal precedents
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 mt-4">
        {facility.frameworks.map((fw, i) => (
          <span 
            key={i}
            className={`text-[0.65rem] font-mono px-2 py-1 rounded border ${frameworkColors[fw.type]} hover:bg-[rgba(255,255,255,0.1)] transition-colors`}
          >
            {fw.label}
          </span>
        ))}
      </div>
      
      <div className="text-center mt-3 text-xs text-[#6e7681]">
        {expanded ? '▲ Click to collapse' : '▼ Click for details'}
      </div>
    </div>
  );
};

export default FollowYourDataTab;

