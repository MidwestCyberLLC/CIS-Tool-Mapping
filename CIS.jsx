import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Layers, BarChart2, Info, Menu, X, ChevronDown, ChevronRight, Check, Download, Shield, Grid, List } from 'lucide-react';

// --- Constants & Data Sources ---
const URLS = {
  safeguards: 'https://raw.githubusercontent.com/MidwestCyberLLC/CIS-Tool-Mapping/refs/heads/main/safeguards.json',
  tools: 'https://raw.githubusercontent.com/MidwestCyberLLC/CIS-Tool-Mapping/refs/heads/main/tools.json',
  mapping: 'https://raw.githubusercontent.com/MidwestCyberLLC/CIS-Tool-Mapping/refs/heads/main/mapping.json'
};

// --- Helper Components ---

const LoadingScreen = ({ status }) => (
  <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-4">
    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
    <h2 className="text-xl font-bold text-gray-800">CIS Mapper App</h2>
    <p className="text-gray-500 mt-2 text-center">{status || "Initializing..."}</p>
  </div>
);

const Badge = ({ children, className, color = "blue" }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-800 border-blue-200",
    green: "bg-green-100 text-green-800 border-green-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    gray: "bg-gray-100 text-gray-800 border-gray-200",
    purple: "bg-purple-100 text-purple-800 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colors[color] || colors.gray} ${className}`}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>
        <div className="p-4 overflow-y-auto">
          {children}
        </div>
        <div className="p-4 border-t bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main Application Component ---

export default function App() {
  // Data State
  const [data, setData] = useState({ tools: [], safeguards: [], mappings: [], loading: true, error: null });
  const [processedData, setProcessedData] = useState({ toolMap: {}, safeguardMap: {}, toolToSafeguards: {} });
  
  // UI State
  const [activeTab, setActiveTab] = useState('mapper'); // 'mapper' | 'aggregator' | 'info'
  const [loadingStatus, setLoadingStatus] = useState("Connecting to Server...");
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  // Fetch Data on Mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingStatus("Fetching Safeguards...");
        const sgRes = await fetch(URLS.safeguards);
        const safeguards = await sgRes.json();

        setLoadingStatus("Fetching Tools...");
        const tRes = await fetch(URLS.tools);
        const tools = await tRes.json();

        setLoadingStatus("Fetching Mappings...");
        const mRes = await fetch(URLS.mapping);
        const mappings = await mRes.json();

        setLoadingStatus("Processing Data...");
        
        // Process Data
        const toolMap = {};
        const toolToSafeguards = {};
        const safeguardMap = {};

        tools.forEach(t => {
          const id = t.id || t.ID || t.ToolID;
          // Normalize weird JSON keys
          toolMap[id] = {
            ...t,
            id,
            name: t.name || t.Name || t.ToolName,
            desc: t.description || t.Description,
            educationUse: (t.EducationUse === true || t.EducationUse === "true"),
            cost: t.Cost || ""
          };
          toolToSafeguards[id] = [];
        });

        safeguards.forEach(s => {
          const id = s.id || s.ID || s.SafeguardID || s.number;
          safeguardMap[id] = {
            ...s,
            id,
            title: s.title || s.Title || s.name,
            description: s.description || s.Description,
            tier: String(s.TierNumber || s.tier || s.Tier || 'N/A'),
            ig: String(s.IGNumber || (s.ig1 ? 1 : s.ig2 ? 2 : 3)), // Simple fallback
            controlNumber: Number(s.ControlNumber)
          };
        });

        mappings.forEach(m => {
          const tId = m.tool_id || m.ToolID || m.toolId;
          const sId = m.safeguard_id || m.SafeguardID || m.safeguardId;
          if (toolToSafeguards[tId]) {
            toolToSafeguards[tId].push(sId);
          }
        });

        setData({ tools, safeguards, mappings, loading: false });
        setProcessedData({ toolMap, safeguardMap, toolToSafeguards });

      } catch (err) {
        console.error(err);
        setData(prev => ({ ...prev, loading: false, error: err.message }));
      }
    };

    fetchData();
  }, []);

  if (data.loading) return <LoadingScreen status={loadingStatus} />;
  if (data.error) return <div className="p-8 text-red-600">Error loading data: {data.error}</div>;

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-slate-800 font-sans overflow-hidden">
      {/* AI Disclaimer Modal */}
      <Modal isOpen={showDisclaimer} onClose={() => setShowDisclaimer(false)} title="AI Analysis Disclaimer">
        <div className="flex items-start gap-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm text-gray-600">
            The tools and mappings listed in this app are the result of analysis by AI. 
            It is your responsibility to determine if a tool successfully meets the needs 
            of your organization.
          </p>
        </div>
      </Modal>

      {/* Header */}
      <header className="bg-slate-900 text-white p-4 shadow-md flex-none z-20">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="text-blue-400 w-6 h-6" />
            <h1 className="text-lg font-bold tracking-tight">CIS Mapper</h1>
          </div>
          <button onClick={() => setShowDisclaimer(true)} className="text-slate-400 hover:text-white">
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative bg-gray-50">
        {activeTab === 'mapper' && (
          <MapperView 
            safeguards={data.safeguards} 
            processedData={processedData} 
            mappings={data.mappings}
          />
        )}
        {activeTab === 'aggregator' && (
          <AggregatorView 
            processedData={processedData} 
          />
        )}
      </main>

      {/* Bottom Navigation (Android Style) */}
      <nav className="bg-white border-t border-gray-200 flex justify-around items-center h-16 pb-safe shadow-lg z-30">
        <NavButton 
          active={activeTab === 'mapper'} 
          onClick={() => setActiveTab('mapper')} 
          icon={<List size={24} />} 
          label="Mapper" 
        />
        <NavButton 
          active={activeTab === 'aggregator'} 
          onClick={() => setActiveTab('aggregator')} 
          icon={<Grid size={24} />} 
          label="Aggregator" 
        />
      </nav>
    </div>
  );
}

// --- Components for Mapper View ---

function MapperView({ safeguards, processedData, mappings }) {
  const [viewMode, setViewMode] = useState('control'); // 'control' | 'tool'
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    ig: [],
    tier: [],
    edu: false,
    cost: []
  });
  const [showFilters, setShowFilters] = useState(false);

  // Derived Data for Filtering
  const filteredContent = useMemo(() => {
    const term = search.toLowerCase();
    const results = [];

    if (viewMode === 'control') {
      // Group Safeguards by Control
      const controls = {};
      Object.values(processedData.safeguardMap).forEach(sg => {
        if (!controls[sg.controlNumber]) controls[sg.controlNumber] = [];
        controls[sg.controlNumber].push(sg);
      });

      Object.entries(controls).sort((a,b) => Number(a[0]) - Number(b[0])).forEach(([cNum, sgs]) => {
        // Filter Safeguards
        const visibleSgs = sgs.filter(sg => {
          // Search Text Match
          const textMatch = !term || 
            sg.title.toLowerCase().includes(term) || 
            sg.description.toLowerCase().includes(term) ||
            sg.id.toLowerCase().includes(term);
          
          // IG Filter
          const igMatch = filters.ig.length === 0 || filters.ig.includes(String(sg.ig));
          // Tier Filter
          const tierMatch = filters.tier.length === 0 || filters.tier.includes(String(sg.tier));

          return textMatch && igMatch && tierMatch;
        });

        if (visibleSgs.length > 0) {
          results.push({ type: 'control', id: cNum, items: visibleSgs });
        }
      });
    } else {
      // Tools View
      Object.values(processedData.toolMap).sort((a,b) => a.name.localeCompare(b.name)).forEach(tool => {
        const textMatch = !term || 
            tool.name.toLowerCase().includes(term) || 
            tool.desc.toLowerCase().includes(term);
        
        const eduMatch = !filters.edu || tool.educationUse;
        
        const toolCosts = tool.cost.split(',').map(c => c.trim());
        const costMatch = filters.cost.length === 0 || toolCosts.some(c => filters.cost.includes(c));

        if (textMatch && eduMatch && costMatch) {
          results.push({ type: 'tool', item: tool });
        }
      });
    }

    return results;
  }, [viewMode, search, filters, processedData]);

  return (
    <div className="flex flex-col h-full">
      {/* Mapper Controls */}
      <div className="bg-white border-b border-gray-200 p-4 flex flex-col gap-3 shadow-sm z-10">
        {/* Toggle View */}
        <div className="flex bg-gray-100 p-1 rounded-lg self-center w-full max-w-xs">
          <button 
            onClick={() => setViewMode('control')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'control' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
          >
            By Control
          </button>
          <button 
            onClick={() => setViewMode('tool')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'tool' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
          >
            By Tool
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <input 
            type="text" 
            placeholder={viewMode === 'control' ? "Search Safeguards (e.g. 'data recovery')..." : "Search Tools..."}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-2 top-1.5 p-1 rounded hover:bg-gray-200 ${showFilters ? 'text-blue-600 bg-blue-50' : 'text-gray-400'}`}
          >
            <Filter size={18} />
          </button>
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="p-3 bg-slate-50 rounded-lg border border-gray-200 text-sm space-y-3 animate-in slide-in-from-top-2">
            {viewMode === 'control' ? (
              <>
                <div>
                  <span className="font-semibold block mb-1 text-xs uppercase text-gray-500">Implementation Group</span>
                  <div className="flex gap-2">
                    {['1', '2', '3'].map(ig => (
                      <FilterChip 
                        key={ig} 
                        label={`IG ${ig}`} 
                        active={filters.ig.includes(ig)}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            ig: prev.ig.includes(ig) ? prev.ig.filter(i => i !== ig) : [...prev.ig, ig]
                          }));
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <span className="font-semibold block mb-1 text-xs uppercase text-gray-500">Tier</span>
                  <div className="flex flex-wrap gap-2">
                    {['1', '2', '3', '4', '5', '6'].map(t => (
                      <FilterChip 
                        key={t} 
                        label={`T${t}`} 
                        active={filters.tier.includes(t)}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            tier: prev.tier.includes(t) ? prev.tier.filter(i => i !== t) : [...prev.tier, t]
                          }));
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="font-semibold block mb-1 text-xs uppercase text-gray-500">Characteristics</span>
                  <FilterChip 
                    label="K-12 Education Use" 
                    active={filters.edu} 
                    onClick={() => setFilters(prev => ({ ...prev, edu: !prev.edu }))}
                  />
                </div>
                <div>
                  <span className="font-semibold block mb-1 text-xs uppercase text-gray-500">Cost</span>
                  <div className="flex gap-2">
                    {['$', '$$', '$$$', '$$$$', '$$$$$'].map(c => (
                      <FilterChip 
                        key={c} 
                        label={c} 
                        active={filters.cost.includes(c)}
                        onClick={() => {
                          setFilters(prev => ({
                            ...prev,
                            cost: prev.cost.includes(c) ? prev.cost.filter(i => i !== c) : [...prev.cost, c]
                          }));
                        }}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {filteredContent.length === 0 ? (
          <div className="text-center text-gray-400 mt-10 italic">No results found matching your criteria.</div>
        ) : (
          filteredContent.map((entry, idx) => (
            viewMode === 'control' ? (
              <ControlCard key={entry.id} controlId={entry.id} items={entry.items} mappings={mappings} processedData={processedData} />
            ) : (
              <ToolCard key={entry.item.id} tool={entry.item} mappings={mappings} processedData={processedData} />
            )
          ))
        )}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

function ControlCard({ controlId, items, mappings, processedData }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="text-left">
          <h3 className="font-bold text-slate-800">CIS Control {controlId}</h3>
          <p className="text-xs text-gray-500">{items.length} Safeguard{items.length !== 1 ? 's' : ''}</p>
        </div>
        {isOpen ? <ChevronDown className="text-gray-400" /> : <ChevronRight className="text-gray-400" />}
      </button>
      
      {isOpen && (
        <div className="border-t border-gray-100 bg-gray-50">
          {items.map(sg => (
            <SafeguardItem key={sg.id} sg={sg} mappings={mappings} processedData={processedData} />
          ))}
        </div>
      )}
    </div>
  );
}

function SafeguardItem({ sg, mappings, processedData }) {
  const [expanded, setExpanded] = useState(false);
  // Find tools for this safeguard
  const relatedTools = mappings
    .filter(m => (m.SafeguardID || m.safeguard_id) === sg.id)
    .map(m => {
      const tId = m.ToolID || m.tool_id;
      return { tool: processedData.toolMap[tId], rationale: m.Rationale };
    })
    .filter(item => item.tool);

  return (
    <div className="p-4 border-b border-gray-200 last:border-0">
      <div 
        className="cursor-pointer" 
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex justify-between items-start gap-2">
          <h4 className="text-sm font-bold text-gray-800 flex-1">
            {sg.id} - {sg.title}
          </h4>
          <div className="flex gap-1 flex-none">
            <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[10px] rounded font-bold">IG{sg.ig}</span>
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded font-bold">T{sg.tier}</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{sg.description}</p>
        
        <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 font-medium">
           {relatedTools.length} Mapped Tool{relatedTools.length !== 1 ? 's' : ''}
           {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pl-3 border-l-2 border-blue-100 space-y-3">
          {relatedTools.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No tools mapped yet.</p>
          ) : (
            relatedTools.map(({ tool, rationale }) => (
              <div key={tool.id} className="bg-white p-2 rounded border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-slate-700">{tool.name}</span>
                  <div className="flex gap-1">
                     {tool.educationUse && <Badge color="purple" className="text-[10px]">K12</Badge>}
                     {tool.cost && <Badge color="green" className="text-[10px]">{tool.cost}</Badge>}
                  </div>
                </div>
                {rationale && <p className="text-xs text-gray-500 mt-1 italic">"{rationale}"</p>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function ToolCard({ tool, mappings, processedData }) {
  const [expanded, setExpanded] = useState(false);
  // Find safeguards for this tool
  const relatedSgs = mappings
    .filter(m => (m.ToolID || m.tool_id) === tool.id)
    .map(m => {
      const sId = m.SafeguardID || m.safeguard_id;
      return { sg: processedData.safeguardMap[sId], rationale: m.Rationale };
    })
    .filter(item => item.sg);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
       <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(!expanded)}>
          <div className="flex justify-between items-start">
             <h3 className="font-bold text-slate-800">{tool.name}</h3>
             <div className="flex gap-1 flex-wrap justify-end max-w-[40%]">
                {tool.cost && tool.cost.split(',').map(c => <Badge key={c} color="green" className="text-[10px] mb-1">{c}</Badge>)}
                {tool.educationUse && <Badge color="purple" className="text-[10px] mb-1">K-12</Badge>}
             </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{tool.desc}</p>
          <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 font-medium">
            {relatedSgs.length} Safeguards Covered
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
       </div>
       
       {expanded && (
         <div className="bg-gray-50 p-4 border-t border-gray-100">
            <div className="space-y-2">
              {relatedSgs.map(({ sg, rationale }) => (
                <div key={sg.id} className="text-sm border-b border-gray-200 last:border-0 pb-2">
                   <div className="flex justify-between">
                      <span className="font-mono font-bold text-xs text-slate-600">{sg.id}</span>
                      <span className="text-[10px] text-gray-400">IG{sg.ig}</span>
                   </div>
                   <p className="font-medium text-gray-800 text-xs">{sg.title}</p>
                   {rationale && <p className="text-xs text-gray-500 mt-1 pl-2 border-l-2 border-gray-300 italic">{rationale}</p>}
                </div>
              ))}
            </div>
         </div>
       )}
    </div>
  );
}

// --- Components for Aggregator View ---

function AggregatorView({ processedData }) {
  const [selectedTools, setSelectedTools] = useState(new Set());
  const [toolSearch, setToolSearch] = useState('');
  const [showToolSelector, setShowToolSelector] = useState(true); // Toggle between selection and map
  
  const [mapFilter, setMapFilter] = useState({ ig: [], tier: [], minCount: 0 });

  const toggleTool = (id) => {
    const newSet = new Set(selectedTools);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedTools(newSet);
  };

  // Calculate Coverage
  const coverage = useMemo(() => {
    const counts = {}; // { sgId: { count: 0, tools: [] } }
    selectedTools.forEach(tId => {
      const tool = processedData.toolMap[tId];
      const sIds = processedData.toolToSafeguards[tId] || [];
      sIds.forEach(sId => {
        if (!counts[sId]) counts[sId] = { count: 0, tools: [] };
        counts[sId].count++;
        counts[sId].tools.push(tool.name);
      });
    });
    return counts;
  }, [selectedTools, processedData]);

  // Filter Safeguards for Heatmap
  const visibleSafeguards = useMemo(() => {
    return Object.values(processedData.safeguardMap).filter(sg => {
      const cData = coverage[sg.id] || { count: 0 };
      const igMatch = mapFilter.ig.length === 0 || mapFilter.ig.includes(String(sg.ig));
      const tierMatch = mapFilter.tier.length === 0 || mapFilter.tier.includes(String(sg.tier));
      const countMatch = cData.count >= mapFilter.minCount;
      return igMatch && tierMatch && countMatch;
    }).sort((a, b) => {
      // Sort naturally by ID
       return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [coverage, mapFilter, processedData]);

  const availableTools = Object.values(processedData.toolMap)
    .filter(t => {
      const term = toolSearch.toLowerCase();
      return !selectedTools.has(t.id) && (t.name.toLowerCase().includes(term));
    })
    .sort((a,b) => a.name.localeCompare(b.name));

  return (
    <div className="flex flex-col h-full">
      {/* Aggregator Controls */}
      <div className="bg-white border-b border-gray-200 p-3 shadow-sm z-10">
        <div className="flex items-center justify-between mb-2">
           <h2 className="font-bold text-gray-800 text-sm">Coverage Heatmap</h2>
           <button 
             onClick={() => setShowToolSelector(!showToolSelector)}
             className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full"
           >
             {showToolSelector ? "Hide Tools" : "Select Tools"}
           </button>
        </div>
        
        {/* Tool Selector Area */}
        {showToolSelector && (
          <div className="mb-3 animate-in slide-in-from-top-5">
            <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
               {/* Selected Tools Chips */}
               {selectedTools.size === 0 && <span className="text-xs text-gray-400 italic">No tools selected.</span>}
               {Array.from(selectedTools).map(tId => {
                 const t = processedData.toolMap[tId];
                 return (
                   <div key={tId} className="flex items-center bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs whitespace-nowrap">
                     <span className="mr-1 font-medium">{t.name}</span>
                     <button onClick={() => toggleTool(tId)}><X size={12}/></button>
                   </div>
                 );
               })}
            </div>
            
            <div className="relative">
              <input 
                className="w-full text-xs p-2 border rounded bg-gray-50"
                placeholder="Add tool..." 
                value={toolSearch}
                onChange={(e) => setToolSearch(e.target.value)}
              />
              {toolSearch && (
                <div className="absolute top-full left-0 right-0 bg-white border shadow-lg max-h-40 overflow-y-auto z-20">
                  {availableTools.map(t => (
                    <button 
                      key={t.id} 
                      onClick={() => { toggleTool(t.id); setToolSearch(''); }}
                      className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 border-b last:border-0"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Heatmap Legend/Filter Lite */}
        <div className="flex items-center justify-between text-xs text-gray-600">
           <div className="flex items-center gap-2">
              <span className="font-semibold">Coverage:</span>
              <div className="flex gap-0.5">
                 <div className="w-3 h-3 bg-gray-100 border"></div> <span className="mr-2">0</span>
                 <div className="w-3 h-3 bg-emerald-200"></div> 
                 <div className="w-3 h-3 bg-emerald-400"></div> 
                 <div className="w-3 h-3 bg-emerald-600"></div>
                 <span className="ml-1">Max</span>
              </div>
           </div>
           <div>{visibleSafeguards.length} SGs</div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="flex-1 overflow-y-auto p-2 bg-slate-100 pb-20">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-1.5">
          {visibleSafeguards.map(sg => {
            const cData = coverage[sg.id] || { count: 0, tools: [] };
            return (
              <HeatmapCell key={sg.id} sg={sg} count={cData.count} tools={cData.tools} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HeatmapCell({ sg, count, tools }) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine Color
  let bgClass = "bg-white text-gray-400 border-gray-200";
  if (count === 1) bgClass = "bg-emerald-100 text-emerald-900 border-emerald-200";
  if (count === 2) bgClass = "bg-emerald-300 text-emerald-900 border-emerald-400";
  if (count === 3) bgClass = "bg-emerald-400 text-white border-emerald-500";
  if (count >= 4) bgClass = "bg-emerald-600 text-white border-emerald-700 shadow-sm";

  const simpleId = sg.id.replace(/^SG\s?/i, '');

  return (
    <div 
      className={`relative aspect-square rounded border flex flex-col items-center justify-center p-1 cursor-pointer transition-transform active:scale-95 ${bgClass}`}
      onClick={() => setShowTooltip(true)}
    >
      <span className="font-bold text-xs sm:text-sm">{simpleId}</span>
      {count > 0 && <span className="text-[10px] font-medium opacity-80">x{count}</span>}

      {showTooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-20" onClick={(e) => { e.stopPropagation(); setShowTooltip(false); }}>
           <div className="bg-white text-slate-800 p-4 rounded-lg shadow-xl w-3/4 max-w-xs mx-auto animate-in zoom-in-95">
              <h3 className="font-bold text-lg mb-1">{sg.id}</h3>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">{sg.title}</p>
              <div className="border-t pt-2">
                 <span className="text-xs font-bold text-gray-500 uppercase">Covered By ({count}):</span>
                 <ul className="mt-1 max-h-32 overflow-y-auto">
                    {tools.length === 0 ? <li className="text-xs text-red-400 italic">Missing Coverage</li> : 
                       tools.map(t => <li key={t} className="text-xs py-0.5 flex items-center"><Check size={10} className="mr-1 text-green-500"/> {t}</li>)
                    }
                 </ul>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center w-full h-full transition-colors ${active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className={`mb-1 ${active ? 'transform scale-110' : ''}`}>{icon}</div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}