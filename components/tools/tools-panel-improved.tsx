"use client";

// Import React and hooks
import React, { useEffect, useState, useRef, useCallback } from "react";
// Import an icon for the collapse button
import { ChevronDownIcon } from "lucide-react"; // Make sure you have lucide-react installed: npm install lucide-react

// --- Interfaces ---
interface ToolSchema {
  type: string;
  properties: Record<string, any>;
  required?: string[];
}

interface Tool {
  id: string; // Unique identifier (e.g., serverId + name)
  name: string;
  description: string;
  server: string;
  schema: ToolSchema;
}

interface ToolsPanelProps {
  onInsertToolExample?: (example: string) => void;
}

// --- Constants for Polling ---
const MAX_FETCH_ATTEMPTS = 6; // Max number of times to try fetching
const FETCH_INTERVAL_MS = 3000; // Milliseconds between fetch attempts
// ---

export default function ToolsPanel({ onInsertToolExample }: ToolsPanelProps) {
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true); // Start in loading state
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [toolApprovalSettings, setToolApprovalSettings] = useState<Record<string, boolean>>({});

  // State for Collapsible List
  const [isCollapsed, setIsCollapsed] = useState(false); // Default to expanded

  // Refs for polling control
  const fetchAttemptsRef = useRef(0);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // --- fetchTools function with polling logic ---
  const fetchTools = useCallback(async () => {
    // Clear previous timeout if any
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }

    // Stop if max attempts reached
    if (fetchAttemptsRef.current >= MAX_FETCH_ATTEMPTS) {
      console.warn(`ToolsPanel: Max fetch attempts reached (${MAX_FETCH_ATTEMPTS}). Stopping polling.`);
      if (tools.length === 0) { // Only show error if nothing was ever loaded
        setError("Could not load tools after multiple attempts.");
      }
      setLoading(false); // Ensure loading stops
      return;
    }

    fetchAttemptsRef.current += 1;
    console.log(`ToolsPanel: Fetch attempt ${fetchAttemptsRef.current}/${MAX_FETCH_ATTEMPTS}`);
    setLoading(true); // Keep loading during attempts
    setError(null); // Clear error from previous attempts

    try {
      const response = await fetch('/api/tools');
      if (!response.ok) {
        throw new Error(`Failed to fetch tools (Status: ${response.status})`);
      }

      const data = await response.json();
      const fetchedTools: Tool[] = Array.isArray(data.tools) ? data.tools : [];

      // --- Polling Logic ---
      if (fetchedTools.length > 0) {
        // Tools found, update state and stop polling
        console.log(`ToolsPanel: Successfully fetched ${fetchedTools.length} tools.`);
        setTools(fetchedTools);
        setLoading(false); // Stop loading indicator
        // No need to set timeout, polling stops
      } else {
        // No tools found yet, schedule next attempt
        console.log(`ToolsPanel: Tool list empty, scheduling retry in ${FETCH_INTERVAL_MS}ms...`);
        timeoutIdRef.current = setTimeout(fetchTools, FETCH_INTERVAL_MS);
        // Keep loading=true
      }
      // --- End Polling Logic ---

    } catch (error: any) {
      console.error('ToolsPanel: Error fetching tools:', error);
      setError(`Failed to load tools: ${error.message}`);
      setLoading(false); // Stop loading on error
      // Stop polling by not setting a new timeout
    }
  // We depend on tools.length to decide whether to show an error after timeout
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools.length]);


  // --- Initial useEffect hook ---
  useEffect(() => {
    // Load approval settings from localStorage (client-side only)
    const loadApprovalSettings = () => {
      if (typeof window !== 'undefined') {
        try {
          const savedSettings = localStorage.getItem('toolApprovalSettings');
          if (savedSettings) {
            setToolApprovalSettings(JSON.parse(savedSettings));
          }
        } catch (e) {
          console.error("Error loading tool approval settings:", e);
        }
      }
    };
    loadApprovalSettings();

    // Reset attempts and start the initial fetch
    fetchAttemptsRef.current = 0;
    fetchTools(); // Start the fetch process

    // Cleanup function to clear timeout on unmount
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        console.log("ToolsPanel: Cleared pending fetch timeout on unmount.");
      }
    };
  }, [fetchTools]); // fetchTools is now stable due to useCallback


  // --- toggleToolApproval function ---
  const toggleToolApproval = (toolKey: string) => {
    const newSettings = {
      ...toolApprovalSettings,
      [toolKey]: !toolApprovalSettings[toolKey]
    };
    setToolApprovalSettings(newSettings);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('toolApprovalSettings', JSON.stringify(newSettings));
      } catch (e) {
        console.error("Error saving tool approval settings:", e);
      }
    }
  };

  // --- handleToolClick function ---
  const handleToolClick = (tool: Tool) => {
    setSelectedTool(tool.id === selectedTool?.id ? null : tool); // Toggle based on ID
  };


  // --- Render Logic for the list content ---
  const renderListContent = () => {
     // Show spinner only while loading AND if no tools have been fetched yet
     if (loading && tools.length === 0) {
         return (
             <div className="flex items-center justify-center py-8">
                 {/* This is the spinner */}
                 <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
             </div>
         );
     }

     // Show error if one occurred (and not loading)
     if (error && !loading) {
         return (
             <div className="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
                 <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
             </div>
         );
     }

     // Show "No tools" only if finished loading and list is confirmed empty
     if (tools.length === 0 && !loading) {
         return <p className="text-sm text-gray-500 px-1">No tools available</p>;
     }

     // Display tools list
     return (
         <div className="space-y-2">
             {tools.map((tool) => {
                 const toolKey = tool.id || `${tool.server}-${tool.name}`; // Fallback key
                 return (
                     <div key={toolKey} className="space-y-2">
                         {/* Button to show/hide details */}
                         <button
                             onClick={() => handleToolClick(tool)}
                             className={`w-full rounded-md p-2 text-left text-sm transition-colors ${
                                 selectedTool?.id === tool.id
                                     ? 'bg-blue-100 dark:bg-blue-900/30'
                                     : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                             }`}
                         >
                             <div className="font-medium">{tool.name}</div>
                             <div className="text-xs text-gray-500 dark:text-gray-400">
                                 Server: {tool.server}
                             </div>
                         </button>

                         {/* Collapsible details section */}
                         {selectedTool?.id === tool.id && (
                             <div className="ml-2 rounded-md border border-gray-200 bg-white p-3 text-sm dark:border-gray-700 dark:bg-gray-800">
                                 <p className="mb-2 text-gray-700 dark:text-gray-300">{tool.description}</p>

                                 {/* Tool Approval Setting */}
                                 <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-700">
                                     <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Requires Approval:</span>
                                     <label className="relative inline-flex cursor-pointer items-center">
                                         <input
                                             type="checkbox"
                                             className="peer sr-only"
                                             checked={!!toolApprovalSettings[toolKey]}
                                             onChange={() => toggleToolApproval(toolKey)}
                                         />
                                         <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700 dark:peer-focus:ring-blue-800"></div>
                                     </label>
                                 </div>

                                 {/* Parameters */}
                                 <div className="mt-3">
                                     <div className="mb-1 font-medium text-gray-600 dark:text-gray-300">Parameters:</div>
                                     <div className="space-y-1">
                                          {Object.keys(tool.schema?.properties || {}).length === 0 ? (
                                                <div className="ml-2 text-xs text-gray-400">No parameters defined</div>
                                            ) : (
                                                Object.entries(tool.schema?.properties || {}).map(([name, prop]: [string, any]) => (
                                                    <div key={name} className="ml-2">
                                                        <span className="font-medium text-gray-800 dark:text-gray-200">{name}</span>
                                                        {tool.schema?.required?.includes(name) && (
                                                            <span className="ml-1 text-red-500" title="Required">*</span>
                                                        )}
                                                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                                            ({prop.type || 'any'})
                                                        </span>
                                                        {prop.description && (
                                                            <div className="text-xs text-gray-500 dark:text-gray-400">{prop.description}</div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                     </div>
                                 </div>

                                 {/* Insert Example Button */}
                                 {onInsertToolExample && (
                                     <button
                                         onClick={() => {
                                              const params = Object.entries(tool.schema?.properties || {})
                                                  .map(([name, prop]: [string, any]) => {
                                                      let exampleValue = '"example"';
                                                      if (prop.default !== undefined) exampleValue = JSON.stringify(prop.default);
                                                      else if (Array.isArray(prop.enum) && prop.enum.length > 0) exampleValue = JSON.stringify(prop.enum[0]);
                                                      else if (prop.type === 'number' || prop.type === 'integer') exampleValue = '0';
                                                      else if (prop.type === 'boolean') exampleValue = 'false';
                                                      else if (prop.type === 'array') exampleValue = '[]';
                                                      else if (prop.type === 'object') exampleValue = '{}';
                                                      return `"${name}": ${exampleValue}`;
                                                  })
                                                  .join(", ");
                                             onInsertToolExample(`${tool.name}({ ${params} })`);
                                         }}
                                         className="mt-3 w-full rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300"
                                     >
                                         Insert Example Call
                                     </button>
                                 )}
                             </div>
                         )}
                     </div>
                 );
             })}
         </div>
     );
  }

  // --- Main Render Function ---
  return (
    // Use a container div with a fixed width that maintains background
    <div className="border-l bg-gray-50 dark:bg-gray-800" style={{ width: '280px' }}>
      {/* Header Button - Toggles Collapse */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex w-full items-center justify-between border-b border-gray-200 p-4 text-left hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-700 dark:hover:bg-gray-700"
        aria-expanded={!isCollapsed}
        aria-controls="tools-list-content"
      >
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Available Tools</h2>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${
            isCollapsed ? "-rotate-90" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Content Area - with dynamic height that collapses completely */}
      <div 
        className={`transition-all duration-300 ease-in-out bg-gray-50 dark:bg-gray-800 ${
          isCollapsed ? 'h-0 overflow-hidden' : 'h-[calc(100vh-124px)]' // Adjust based on your layout
        }`}
      >
        {/* Scrollable inner container */}
        <div className="h-full overflow-y-auto">
          <div id="tools-list-content" className="p-4">
            {renderListContent()}
          </div>
        </div>
      </div>
    </div>
  );
}