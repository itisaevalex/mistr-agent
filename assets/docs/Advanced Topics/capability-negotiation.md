# MCP Capability Negotiation Enhancement

## Overview

This document outlines the plan to enhance the Mistral MCP Adapter with proper capability negotiation according to the Model Context Protocol (MCP) specification. Capability negotiation is a critical part of the MCP protocol that allows clients and servers to explicitly advertise and agree on supported features.

## Current Implementation State

The current Mistral MCP Adapter implements basic capability discovery:

- Connection establishment with MCP servers
- Discovery of available tools from connected servers
- Registration and usage of discovered tools

However, this implementation lacks formal capability negotiation as specified in the MCP protocol.

## What is Capability Negotiation?

Capability negotiation in MCP is a handshake process between clients and servers to:

1. Advertise which features are supported on both sides
2. Establish a common understanding of available functionality
3. Enable version compatibility across different implementations
4. Allow for graceful degradation when features aren't available

## Enhancement Plan

### Phase 1: Core Capability Exchange

Implement the fundamental capability exchange mechanism:

```typescript
interface ServerCapabilities {
  protocolVersion: string;
  features: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
    completion: boolean;
    logging: boolean;
  };
  extensions?: Record<string, any>;
}

interface ClientCapabilities {
  protocolVersion: string;
  features: {
    sampling: boolean;
    roots: boolean;
  };
  extensions?: Record<string, any>;
}
```

During server connection:

```typescript
// In McpServerManager.ts
private async initializeServer(id: string, config: McpServerConfig) {
  // ... existing connection code ...
  
  // Fetch and store server capabilities
  const capabilities = await client.getServerCapabilities();
  serverInstance.capabilities = capabilities;
  
  // Advertise client capabilities
  await client.setClientCapabilities({
    protocolVersion: "2025-03-26",
    features: {
      sampling: false,
      roots: false
    }
  });
  
  // ... continue with existing code ...
}
```

### Phase 2: Feature Availability Logic

Add runtime checks before attempting to use any feature:

```typescript
// Example: Checking if a server supports tools
callTool(toolName: string, args: any, serverId?: string): Promise<any> {
  const server = this.getServer(serverId);
  
  // Check if tools feature is supported
  if (!server.capabilities?.features?.tools) {
    throw new Error(`Server ${serverId} does not support tools feature`);
  }
  
  // Proceed with tool call...
  return server.client.callTool({
    name: toolName,
    arguments: args
  });
}
```

### Phase 3: Version Compatibility

Implement version-specific logic for handling different protocol versions:

```typescript
// Helper function to compare protocol versions
function isCompatibleVersion(serverVersion: string, minVersion: string): boolean {
  // Simple version comparison logic
  // In practice, you might use a library like semver
  return serverVersion >= minVersion;
}

// Using version checks in code
if (isCompatibleVersion(server.capabilities.protocolVersion, "2025-03-26")) {
  // Use current approach for newer servers
} else {
  // Use backward-compatible approach
}
```

### Phase 4: UI Integration

Update the UI to reflect available capabilities:

```typescript
// In tools-panel.tsx
const [serverCapabilities, setServerCapabilities] = useState<Record<string, any>>({});

// Fetch capabilities during initialization
useEffect(() => {
  async function fetchCapabilities() {
    const response = await fetch('/api/server-capabilities');
    if (response.ok) {
      const data = await response.json();
      setServerCapabilities(data.capabilities);
    }
  }
  
  fetchCapabilities();
}, []);

// Conditionally render UI elements based on capabilities
return (
  <div>
    <h2>Available Features</h2>
    
    {serverCapabilities.features?.tools && (
      <div>
        <h3>Tools</h3>
        {/* Tool UI elements */}
      </div>
    )}
    
    {serverCapabilities.features?.resources && (
      <div>
        <h3>Resources</h3>
        {/* Resource UI elements */}
      </div>
    )}
  </div>
);
```

## Benefits of Enhanced Capability Negotiation

1. **Robustness**: The adapter will work reliably with different server implementations
2. **Future-proofing**: Easier adaptation to future MCP specification changes
3. **Extension support**: Framework for custom capabilities beyond the core spec
4. **Better error handling**: Clearer error messages when features aren't available
5. **Improved user experience**: UI that accurately reflects available capabilities

## Implementation Priority

This enhancement should be prioritized after implementing the core functionality for resource support, as it builds upon the existing infrastructure and improves the reliability of all feature interactions.
