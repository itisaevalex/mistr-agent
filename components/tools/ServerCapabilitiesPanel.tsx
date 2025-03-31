import React, { useEffect, useState } from 'react';
import { NegotiatedCapabilities } from '../../lib/mistral/mcp-types';

interface ServerCapabilitiesPanelProps {
  serverId: string;
  getCapabilities: (serverId: string) => Promise<NegotiatedCapabilities | undefined>;
}

export function ServerCapabilitiesPanel({ 
  serverId, 
  getCapabilities 
}: ServerCapabilitiesPanelProps) {
  const [capabilities, setCapabilities] = useState<NegotiatedCapabilities | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchCapabilities() {
      try {
        setIsLoading(true);
        const result = await getCapabilities(serverId);
        setCapabilities(result || null);
        setError(null);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
        setCapabilities(null);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchCapabilities();
  }, [serverId, getCapabilities]);
  
  if (isLoading) {
    return <div className="p-4 bg-slate-100 rounded-md">Loading server capabilities...</div>;
  }
  
  if (error) {
    return (
      <div className="p-4 bg-red-100 text-red-800 rounded-md">
        <h3 className="font-bold">Error Loading Capabilities</h3>
        <p>{error}</p>
      </div>
    );
  }
  
  if (!capabilities) {
    return (
      <div className="p-4 bg-yellow-100 text-yellow-800 rounded-md">
        <h3 className="font-bold">No Capabilities Information</h3>
        <p>Capability information for server "{serverId}" is not available.</p>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-md shadow p-4">
      <h2 className="text-xl font-bold mb-4">Server Capabilities: {serverId}</h2>
      
      <div className="mb-4">
        <h3 className="font-semibold">Protocol Version</h3>
        <div className="bg-blue-50 p-2 rounded-md">
          {capabilities.protocolVersion}
        </div>
      </div>
      
      <div className="mb-4">
        <h3 className="font-semibold">Supported Features</h3>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {Object.entries(capabilities).map(([feature, supported]) => {
            // Skip non-boolean properties and extensions
            if (feature === 'protocolVersion' || feature === 'extensions') {
              return null;
            }
            return (
              <div 
                key={feature}
                className={`p-2 rounded-md flex items-center ${
                  supported ? 'bg-green-50 text-green-800' : 'bg-gray-50 text-gray-500'
                }`}
              >
                <span className={`mr-2 inline-block w-4 h-4 rounded-full ${
                  supported ? 'bg-green-500' : 'bg-gray-300'
                }`}></span>
                <span className="capitalize">{feature}</span>
              </div>
            );
          })}
        </div>
      </div>
      
      {capabilities.extensions && Object.keys(capabilities.extensions).length > 0 && (
        <div>
          <h3 className="font-semibold">Extensions</h3>
          <div className="mt-2">
            {Object.entries(capabilities.extensions).map(([name, details]) => (
              <div key={name} className="bg-purple-50 p-2 rounded-md mb-2">
                <div className="font-medium">{name}</div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {JSON.stringify(details, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}