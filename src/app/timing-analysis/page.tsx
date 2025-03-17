'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { fetchTimingReport, extractPathFromUrl } from '@/lib/talosApi';

// Define types for analysis results
interface AnalysisIssue {
  issue: string;
  suggestions: string[];
}

interface AnalysisResult {
  hasViolation: boolean;
  slack: number | null;
  startpoint: string;
  endpoint: string;
  issues: AnalysisIssue[];
  logicDepth: number;
  depthAnalysis: string;
  cellTypes: number;
}

// Sample timing path formats for different tools
const samplePaths: Record<string, string> = {
  synopsys: 
`Startpoint: core/register_file/register_memory_reg[5][31] (rising edge-triggered flip-flop clocked by CLK)
Endpoint: core/alu/result_reg[31] (rising edge-triggered flip-flop clocked by CLK)
Path Group: CLK
Path Type: max

Point                                    Incr       Path
---------------------------------------------------------------
clock CLK (rise edge)                   0.000      0.000
clock network delay (propagated)        0.387      0.387
core/register_file/register_memory_reg[5][31]/CLK (DFFARX1_RVT)
                                        0.000      0.387 r
core/register_file/register_memory_reg[5][31]/Q (DFFARX1_RVT)
                                        0.212      0.599 f
core/register_file/U4562/Y (NAND3X0_RVT)
                                        0.095      0.694 r
core/register_file/U3211/Y (INVX0_RVT) 0.087      0.781 f
core/alu/U267/Y (AO22X1_RVT)           0.132      0.913 f
core/alu/U1045/Y (NAND2X0_RVT)         0.068      0.981 r
core/alu/U2456/Y (AND2X1_RVT)          0.104      1.085 r
core/alu/U3789/Y (OA21X1_RVT)          0.116      1.201 r
core/alu/U4201/Y (NAND2X0_RVT)         0.068      1.269 f
core/alu/result_reg[31]/D (DFFARX1_RVT)
                                        0.000      1.269 f
data arrival time                                  1.269

clock CLK (rise edge)                   1.200      1.200
clock network delay (propagated)        0.387      1.587
clock uncertainty                      -0.050      1.537
core/alu/result_reg[31]/CLK (DFFARX1_RVT)
                                        0.000      1.537 r
library setup time                     -0.138      1.399
data required time                                 1.399
---------------------------------------------------------------
data required time                                 1.399
data arrival time                                 -1.269
---------------------------------------------------------------
slack (MET)                                        0.130`,

  cadence: 
`Path 1: VIOLATED Setup Check with Pin core/alu/result_reg[15]/D 
Endpoint:   core/alu/result_reg[15]/D (^) checked with leading edge of 'CLK'
Beginpoint: core/register_file/register_memory_reg[3][15]/Q (^) triggered by leading edge of 'CLK'
Path Group: CLK 
Path Type: max 

Delay      Time   Description
------------------------------------------------------------------------------------
0.000      0.000  clock CLK (rise edge)
0.412      0.412  clock network delay (ideal)
0.000      0.412  core/register_file/register_memory_reg[3][15]/CLK (DFFX1_RVT)
0.187      0.599  core/register_file/register_memory_reg[3][15]/Q (DFFX1_RVT)
0.104      0.703  core/register_file/U2134/Y (INVX1_RVT)
0.132      0.835  core/register_file/U3567/Y (NAND2X0_RVT)
0.095      0.930  core/alu/U456/Y (AOI22X1_RVT)
0.112      1.042  core/alu/U789/Y (OAI21X1_RVT)
0.087      1.129  core/alu/U1023/Y (INVX2_RVT)
0.143      1.272  core/alu/U1567/Y (AO22X1_RVT)
0.000      1.272  core/alu/result_reg[15]/D (DFFX1_RVT)
1.272      1.272  data arrival time

1.200      1.200  clock CLK (rise edge)
0.412      1.612  clock network delay (ideal)
-0.050     1.562  clock uncertainty
-0.135     1.427  library setup time
1.427      1.427  data required time
------------------------------------------------------------------------------------
1.427      1.427  data required time
-1.272     -1.272 data arrival time
------------------------------------------------------------------------------------
0.155      0.155  slack (MET)`
};

// Common timing path issues and solutions
const timingIssues = [
  {
    pattern: /slack \(VIOLATED\)/i,
    issue: "Timing violation detected",
    suggestions: [
      "Consider upsizing critical cells in the path",
      "Optimize logic depth to reduce delay",
      "Check for high fanout nets and buffer them",
      "Review clock skew between source and destination"
    ]
  },
  {
    pattern: /high fanout/i,
    issue: "High fanout net detected",
    suggestions: [
      "Add buffers to distribute the load",
      "Consider register duplication for critical paths",
      "Use higher drive strength cells for the driver"
    ]
  },
  {
    pattern: /(INVX0|NAND2X0|NOR2X0|BUFX0)_RVT/,
    issue: "Low drive strength cells in critical path",
    suggestions: [
      "Upsize cells to higher drive strength variants",
      "Replace X0 cells with X1 or X2 variants",
      "Consider using faster cell types (e.g., RVT to LVT)"
    ]
  },
  {
    pattern: /clock uncertainty/i,
    issue: "Clock uncertainty affecting timing",
    suggestions: [
      "Review clock tree synthesis settings",
      "Check for excessive clock jitter or skew",
      "Consider using more balanced clock tree"
    ]
  },
  {
    pattern: /long path/i,
    issue: "Long logic path detected",
    suggestions: [
      "Consider logic restructuring to reduce depth",
      "Add pipeline registers to break long paths",
      "Review synthesis constraints for the path"
    ]
  }
];

// Function to analyze timing path
const analyzePath = (path: string): AnalysisResult => {
  // Determine if the path has a violation
  const hasViolation = path.includes('VIOLATED') || path.includes('slack (VIOLATED)') || 
                      (path.includes('slack') && path.includes('-'));
  
  // Extract key timing information
  const slackMatch = path.match(/slack\s+\((MET|VIOLATED)\)\s+([-\d.]+)/i) || 
                    path.match(/([-\d.]+)\s+slack\s+\((MET|VIOLATED)\)/i);
  
  const slack = slackMatch ? parseFloat(slackMatch[2] || slackMatch[1]) : null;
  
  // Extract path details
  const startpointMatch = path.match(/Startpoint:\s+(.+?)(?:\s+\(|$)/i) || 
                         path.match(/Beginpoint:\s+(.+?)(?:\s+\(|$)/i);
  const startpoint = startpointMatch ? startpointMatch[1].trim() : "Unknown";
  
  const endpointMatch = path.match(/Endpoint:\s+(.+?)(?:\s+\(|$)/i);
  const endpoint = endpointMatch ? endpointMatch[1].trim() : "Unknown";
  
  // Identify potential issues
  const issues = timingIssues.filter(issue => issue.pattern.test(path))
                            .map(issue => ({
                              issue: issue.issue,
                              suggestions: issue.suggestions
                            }));
  
  // If no specific issues found but there's a violation, add generic advice
  if (hasViolation && issues.length === 0) {
    issues.push({
      issue: "Timing violation detected",
      suggestions: [
        "Analyze the critical path for high delay cells",
        "Check for long interconnect delays",
        "Review clock constraints and clock tree synthesis",
        "Consider architectural changes to reduce logic depth"
      ]
    });
  }
  
  // Identify cells in the path
  const cellsMatch = path.match(/\/Y\s+\(([A-Z0-9_]+)\)/g);
  const cells = cellsMatch ? cellsMatch.map(match => {
    const cellMatch = match.match(/\(([A-Z0-9_]+)\)/);
    return cellMatch ? cellMatch[1] : "";
  }) : [];
  
  // Count cell types to identify patterns
  const cellCounts: Record<string, number> = cells.reduce((acc: Record<string, number>, cell) => {
    const baseCell = cell.replace(/X\d+_[A-Z]+$/, ''); // Remove size and voltage variants
    acc[baseCell] = (acc[baseCell] || 0) + 1;
    return acc;
  }, {});
  
  // Check for logic depth issues
  const logicDepth = cells.length;
  let depthAnalysis = "";
  if (logicDepth > 8) {
    depthAnalysis = "High logic depth detected. Consider restructuring logic or adding pipeline stages.";
    if (!issues.some(i => i.issue.includes("Long logic path"))) {
      issues.push({
        issue: "Long logic path detected",
        suggestions: [
          "Add pipeline registers to break the path",
          "Restructure logic to reduce depth",
          "Review synthesis constraints"
        ]
      });
    }
  }
  
  return {
    hasViolation,
    slack,
    startpoint,
    endpoint,
    issues,
    logicDepth,
    depthAnalysis,
    cellTypes: Object.keys(cellCounts).length
  };
};

export default function TimingAnalysisPage() {
  const [timingPath, setTimingPath] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedExample, setSelectedExample] = useState('');
  const [talosPath, setTalosPath] = useState('https://rno.talos.nvidia.com/edawsbrowse/home/chuckc/short_tree_long');
  const [talosError, setTalosError] = useState('');
  const [isFetchingTalos, setIsFetchingTalos] = useState(false);

  const handleAnalyze = () => {
    if (!timingPath.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate analysis delay
    setTimeout(() => {
      const result = analyzePath(timingPath);
      setAnalysis(result);
      setIsAnalyzing(false);
    }, 1000);
  };

  const loadExample = (type: string) => {
    setSelectedExample(type);
    setTimingPath(samplePaths[type]);
    setAnalysis(null);
  };

  const handleFetchFromTalos = async () => {
    if (!talosPath.trim()) return;
    
    setIsFetchingTalos(true);
    setTalosError('');
    
    try {
      console.log(`Fetching from Talos: ${talosPath}`);
      // Use the simplified approach with mock data
      const reportContent = await fetchTimingReport(talosPath);
      console.log('Fetch successful, content length:', reportContent.length);
      setTimingPath(reportContent);
      setSelectedExample('');
    } catch (error) {
      console.error('Error fetching from Talos:', error);
      setTalosError(error instanceof Error ? error.message : 'Failed to fetch from Talos. Make sure you are connected to NVIDIA VPN.');
    } finally {
      setIsFetchingTalos(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-800 to-secondary-800 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">Timing Path Analysis</h1>
          <p className="text-center mb-8">Paste your timing path report from Synopsys PrimeTime or Cadence Innovus/Tempus for analysis</p>
        </motion.div>

        {/* VPN Warning Banner */}
        <div className="bg-yellow-500/20 border border-yellow-500/50 p-4 rounded-lg mb-6">
          <p className="font-bold text-yellow-300">⚠️ VPN Required</p>
          <p className="text-yellow-100">You must be connected to NVIDIA VPN to fetch data from Talos.</p>
        </div>

        {/* Talos Integration Section */}
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-lg mb-6">
          <h2 className="text-xl font-semibold mb-4">Fetch from Talos</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              className="flex-grow p-3 bg-black/30 text-white rounded-lg"
              value={talosPath}
              onChange={(e) => setTalosPath(e.target.value)}
              placeholder="Enter Talos file path (e.g., /home/username/timing_report.txt)"
            />
            <button
              className="md:w-48 bg-primary-600 hover:bg-primary-500 p-3 rounded-lg transition-colors"
              onClick={handleFetchFromTalos}
              disabled={isFetchingTalos || !talosPath.trim()}
            >
              {isFetchingTalos ? 'Fetching...' : 'Fetch from Talos'}
            </button>
          </div>
          {talosError && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300">{talosError}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button 
            className={`p-3 rounded-lg transition-colors ${selectedExample === 'synopsys' ? 'bg-primary-600' : 'bg-white/10 hover:bg-white/20'}`}
            onClick={() => loadExample('synopsys')}
          >
            Load Synopsys PT Example
          </button>
          <button 
            className={`p-3 rounded-lg transition-colors ${selectedExample === 'cadence' ? 'bg-primary-600' : 'bg-white/10 hover:bg-white/20'}`}
            onClick={() => loadExample('cadence')}
          >
            Load Cadence Example
          </button>
          <button 
            className="p-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            onClick={() => {
              setTimingPath('');
              setAnalysis(null);
              setSelectedExample('');
            }}
          >
            Clear
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-sm p-6 rounded-lg"
          >
            <h2 className="text-xl font-semibold mb-4">Input Timing Path</h2>
            <textarea
              className="w-full h-96 p-4 bg-black/30 text-white rounded-lg font-mono text-sm"
              value={timingPath}
              onChange={(e) => setTimingPath(e.target.value)}
              placeholder="Paste your timing path report here..."
            />
            <button
              className="mt-4 bg-primary-600 hover:bg-primary-500 p-3 rounded-lg transition-colors w-full"
              onClick={handleAnalyze}
              disabled={isAnalyzing || !timingPath.trim()}
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Timing Path'}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="bg-white/10 backdrop-blur-sm p-6 rounded-lg"
          >
            <h2 className="text-xl font-semibold mb-4">Analysis Results</h2>
            
            {isAnalyzing ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-300 mb-4"></div>
                  <p>Analyzing timing path...</p>
                </div>
              </div>
            ) : analysis ? (
              <div className="h-96 overflow-y-auto">
                <div className="mb-6 p-4 rounded-lg bg-black/20">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-300">Startpoint:</p>
                      <p className="font-mono">{analysis.startpoint}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">Endpoint:</p>
                      <p className="font-mono">{analysis.endpoint}</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-300">Slack:</p>
                    <p className={`font-mono font-bold ${analysis.hasViolation ? 'text-red-400' : 'text-green-400'}`}>
                      {analysis.slack !== null ? `${analysis.slack} ns` : 'Unknown'}
                      {analysis.hasViolation ? ' (VIOLATED)' : ' (MET)'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-300">Logic Depth:</p>
                      <p className="font-mono">{analysis.logicDepth} cells</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-300">Cell Types:</p>
                      <p className="font-mono">{analysis.cellTypes} different types</p>
                    </div>
                  </div>
                </div>
                
                {analysis.depthAnalysis && (
                  <div className="mb-6 p-4 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
                    <p className="font-semibold">Path Analysis:</p>
                    <p>{analysis.depthAnalysis}</p>
                  </div>
                )}
                
                <h3 className="font-semibold text-lg mb-3">Identified Issues & Suggestions:</h3>
                
                {analysis.issues.length > 0 ? (
                  <div className="space-y-4">
                    {analysis.issues.map((issue, index) => (
                      <div key={index} className="p-4 rounded-lg bg-black/20">
                        <p className="font-semibold text-primary-300 mb-2">{issue.issue}</p>
                        <ul className="list-disc pl-5 space-y-1">
                          {issue.suggestions.map((suggestion, idx) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-green-500/20 border border-green-500/30">
                    <p>No critical issues detected in this timing path.</p>
                    <p className="mt-2">The path meets timing requirements with adequate margin.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-300">
                <div className="text-center">
                  <p className="text-3xl mb-4">📊</p>
                  <p>Paste a timing path and click "Analyze" to see results</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8 text-center"
        >
          <a href="/" className="inline-block bg-white/10 hover:bg-white/20 transition-colors p-3 rounded-lg">
            ← Back to Dashboard
          </a>
        </motion.div>
      </div>
    </div>
  );
} 