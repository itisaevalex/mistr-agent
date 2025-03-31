import React, { useState, useEffect } from 'react';
import { SecurityManager } from '../../lib/mistral/security-manager';

interface SecuritySettingsPanelProps {
  securityManager: SecurityManager;
}

export function SecuritySettingsPanel({ securityManager }: SecuritySettingsPanelProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'settings' | 'history'>('settings');
  
  // Fetch tool call history
  useEffect(() => {
    if (viewMode === 'history') {
      const toolHistory = securityManager.getToolCallHistory();
      setHistory(toolHistory);
    }
  }, [securityManager, viewMode]);
  
  return (
    <div className="p-4 border rounded-lg dark:border-gray-700">
      <div className="flex justify-between mb-4">
        <h2 className="text-xl font-bold">Security Settings</h2>
        
        <div className="flex space-x-2">
          <button 
            className={`px-3 py-1 rounded ${viewMode === 'settings' ? 
              'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setViewMode('settings')}
          >
            Settings
          </button>
          <button 
            className={`px-3 py-1 rounded ${viewMode === 'history' ? 
              'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
            onClick={() => setViewMode('history')}
          >
            History
          </button>
        </div>
      </div>
      
      {viewMode === 'settings' ? (
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded">
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">Security Notice</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              These settings control the security behavior of the Mistral MCP Adapter.
              Changes to these settings will affect which operations require approval
              and how tool calls are monitored.
            </p>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Tool Security Policies</h3>
            <div className="border dark:border-gray-700 rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tool Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requires Approval</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Rate Limit</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">File Reading</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">No</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">30 per minute</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">File Writing</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Yes</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">5 per minute</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">Command Execution</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Yes</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">2 per minute</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">Database Query</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Yes</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">10 per minute</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">API Call</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Yes</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">15 per minute</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">Other Tools</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">No</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">20 per minute</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded mt-4">
            <h3 className="font-medium text-blue-800 dark:text-blue-200">Dangerous Operation Detection</h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              The adapter automatically detects potentially dangerous operations like system commands
              that can modify files, suspicious SQL queries, and access to sensitive system directories.
              These operations will be flagged for additional scrutiny.
            </p>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="font-medium mb-2">Tool Call History</h3>
          
          {history.length === 0 ? (
            <p className="text-gray-500 p-4 text-center">No tool calls recorded yet.</p>
          ) : (
            <div className="border dark:border-gray-700 rounded overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tool</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Details</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {history.map((entry, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.toolName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.allowed ? (
                          <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">Allowed</span>
                        ) : (
                          <span className="px-2 py-1 rounded bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200">Denied</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {entry.reason || 'Standard execution'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
