// src/lib/mistral/test-capability-negotiation.ts

import { loadConfig } from './config';
import { ToolManager } from './tool-manager';
import { McpAdapter } from './mcp-adapter';
import { VersionCompatibility } from './utils/version-compatibility';
import { NegotiatedCapabilities, ServerInfo } from './mcp-types';

// Define interface for the server info returned from getServerInfo
interface ServerInfoDetails {
  connected: boolean;
  serverInfo?: ServerInfo;
  capabilities?: NegotiatedCapabilities;
}

/**
 * Test the enhanced capability negotiation implementation
 */
/**
 * Test the capability negotiation implementation
 */
async function testCapabilityNegotiation() {
  console.log('=== Testing Enhanced Capability Negotiation ===');
  
  // Part 1: Test version compatibility utility
  await testVersionCompatibility();
  
  // Part 2: Test MCP adapter capability negotiation
  await testMcpAdapterCapabilities();
}

/**
 * Test the version compatibility utility
 */
async function testVersionCompatibility() {
  try {
    console.log('\n--- Testing Version Compatibility ---');
    
    const testVersions = [
      { client: '0.1.0', server: '0.1.0' },
      { client: '0.2.0', server: '0.1.0' },
      { client: '0.1.0', server: '0.2.0' },
      { client: '1.0.0', server: '0.9.0' },
      { client: '2025-03-26', server: '2025-03-26' },
      { client: '2025-03-26', server: '2025-01-15' },
      { client: '2024-12-01', server: '2025-03-26' },
    ];
    
    for (const test of testVersions) {
      try {
        const clientVersion = VersionCompatibility.parseVersion(test.client);
        const serverVersion = VersionCompatibility.parseVersion(test.server);
        
        console.log(`Client: ${test.client} (${JSON.stringify(clientVersion)})`);
        console.log(`Server: ${test.server} (${JSON.stringify(serverVersion)})`);
        
        const isCompatible = VersionCompatibility.isCompatible(clientVersion, serverVersion);
        console.log(`-> Compatible: ${isCompatible}`);
        
        if (isCompatible) {
          const negotiated = VersionCompatibility.negotiateVersion(clientVersion, serverVersion);
          console.log(`-> Negotiated version: ${VersionCompatibility.versionToString(negotiated)}`);
        }
        
        console.log('---');
      } catch (error) {
        console.error(`Error testing versions ${test.client} and ${test.server}:`, error);
      }
    }
  } catch (error) {
    console.error('Error in version compatibility test:', error);
  }
}

/**
 * Test the MCP adapter capability negotiation
 */
async function testMcpAdapterCapabilities() {
  let mcpAdapter = null;
  
  try {
    console.log('\n--- Testing MCP Adapter Capability Negotiation ---');
    
    // Load configuration
    console.log('Loading configuration...');
    let config;
    try {
      config = loadConfig();
      console.log('Configuration loaded successfully');
    } catch (error) {
      console.error('Error loading configuration:', error);
      config = {}; // Use default config
    }
    
    // Initialize the adapter
    console.log('Initializing adapter...');
    const toolManager = new ToolManager();
    mcpAdapter = new McpAdapter(config, toolManager, './mcp-config.json');
    
    // Wait for connection
    console.log('Waiting for initialization (max 10s)...');
    try {
      await mcpAdapter.waitForConnection(undefined, 10000);
      console.log('Successfully connected to MCP servers');
    } catch (error) {
      console.error('Error or timeout waiting for MCP servers:', error);
      console.log('Continuing with partial info...');
    }
    
    // Get all servers and their capabilities
    console.log('Getting server information...');
    const servers = mcpAdapter.getServers();
    
    if (Object.keys(servers).length === 0) {
      console.log('No servers found or connected. Please check your mcp-config.json file.');
    } else {
      console.log(`Connected servers: ${Object.keys(servers).filter(id => servers[id]).join(', ')}`);
      console.log(`Disconnected servers: ${Object.keys(servers).filter(id => !servers[id]).join(', ') || 'None'}`);
      
      // Get detailed server info
      const serverInfo = mcpAdapter.getServerInfo() as Record<string, ServerInfoDetails>;
      console.log('\nServer information:');
      
      for (const [serverId, info] of Object.entries(serverInfo)) {
        console.log(`\nServer: ${serverId}`);
        console.log(`Connected: ${info.connected}`);
        
        if (info.serverInfo) {
          console.log(`Server name: ${info.serverInfo.name}`);
          console.log(`Server version: ${info.serverInfo.version}`);
        }
        
        if (info.capabilities) {
          console.log('Capabilities:');
          console.log(`- Protocol version: ${info.capabilities.protocolVersion}`);
          console.log(`- Tools: ${info.capabilities.tools}`);
          console.log(`- Resources: ${info.capabilities.resources}`);
          console.log(`- Prompts: ${info.capabilities.prompts}`);
          console.log(`- Completion: ${info.capabilities.completion}`);
          console.log(`- Streaming: ${info.capabilities.streaming}`);
          
          if (Object.keys(info.capabilities.extensions).length > 0) {
            console.log('- Extensions:', info.capabilities.extensions);
          }
        } else {
          console.log('No capabilities information available for this server');
        }
      }
      
      // Check feature support
      console.log('\nFeature support across servers:');
      for (const feature of ['tools', 'resources', 'prompts', 'completion', 'streaming']) {
        try {
          const supported = mcpAdapter.hasFeature(feature as any);
          console.log(`- Feature '${feature}' supported: ${supported}`);
          
          if (supported) {
            const serversWithFeature = mcpAdapter.getServerManager().getServersWithFeature(feature as any);
            console.log(`  Servers with '${feature}' feature: ${serversWithFeature.join(', ')}`);
          }
        } catch (error) {
          console.error(`Error checking feature '${feature}':`, error);
        }
      }
      
      // Get available tools
      try {
        console.log('\nAvailable tools:');
        const tools = mcpAdapter.getAvailableTools();
        
        if (Object.keys(tools).length === 0) {
          console.log('No tools available from any server');
        } else {
          for (const [serverId, serverTools] of Object.entries(tools)) {
            console.log(`- Server ${serverId}: ${serverTools.length} tools`);
            
            for (const tool of serverTools) {
              console.log(`  - ${tool.name}: ${tool.description || 'No description'}`);
            }
          }
        }
      } catch (error) {
        console.error('Error getting available tools:', error);
      }
    }
  } catch (error) {
    console.error('Error in MCP adapter capability test:', error);
  } finally {
    // Clean up
    if (mcpAdapter) {
      try {
        mcpAdapter.disconnect();
        console.log('\nCleanup complete - disconnected from all servers');
      } catch (error) {
        console.error('Error during cleanup:', error);
      }
    }
    
    console.log('\nTest completed');
  }
}

// Run the test if executed directly
if (require.main === module) {
  testCapabilityNegotiation().catch(console.error);
}

export { testCapabilityNegotiation };
