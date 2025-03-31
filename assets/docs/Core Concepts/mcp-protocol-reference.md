# Model Context Protocol (MCP) Reference

This document provides a reference of MCP features and their implementation status in the Mistral MCP Client.

## Protocol Overview

The Model Context Protocol (MCP) is an open protocol that enables seamless integration between LLM applications and external data sources and tools. It defines a standardized way for AI systems to access contextual information and functionality.

## Core Components

### Base Protocol
- **JSON-RPC Message Format**: All communication uses JSON-RPC 2.0
- **Stateful Connections**: Connections maintain state between requests
- **Capability Negotiation**: Clients and servers advertise supported features

### Server Features
1. **Resources**: Provide read-only data access
2. **Prompts**: Supply templated messages and workflows
3. **Tools**: Offer functions the LLM can execute

### Client Features
1. **Sampling**: Enable server-initiated agent behavior
2. **Roots**: Provide controlled access to client's file system

### Utilities
- **Ping**: Keep-alive mechanism
- **Cancellation**: Ability to cancel in-progress operations
- **Progress**: Track progress of long-running operations
- **Logging**: Structured logging facilities
- **Pagination**: Handle large sets of data

## Implementation Status

| Feature | Status | Priority | Notes |
|---------|--------|----------|-------|
| **Base Protocol** |
| JSON-RPC Format | ✅ Implemented | - | Using `@modelcontextprotocol/sdk` |
| Stateful Connections | ✅ Implemented | - | Via `McpServerManager` |
| Capability Negotiation | ⚠️ Partial | High | Basic connectivity, needs formal exchange |
| **Server Features** |
| Tools | ✅ Implemented | - | Full support for discovery and execution |
| Resources | ❌ Missing | High | Planned for next implementation phase |
| Prompts | ❌ Missing | Medium | To be implemented after resources |
| **Client Features** |
| Sampling | ❌ Missing | Low | Server-initiated agent behavior |
| Roots | ❌ Missing | Low | Controlled file system access |
| **Utilities** |
| Ping | ⚠️ Partial | Low | Basic support through SDK |
| Cancellation | ❌ Missing | Medium | For long-running operations |
| Progress | ❌ Missing | Medium | For long-running operations |
| Logging | ⚠️ Partial | Low | Basic console logging exists |
| Pagination | ❌ Missing | Low | For large data sets |

## Feature Details

### Tools

Tools allow Mistral to perform actions through MCP servers. Our implementation supports:

- Tool discovery from multiple servers
- Tool registration with Mistral
- Tool execution with proper error handling
- Tool result incorporation into responses

Example of a tool definition:
```typescript
{
  name: "get_weather",
  description: "Gets the current weather for a location",
  inputSchema: {
    type: "object",
    properties: {
      location: {
        type: "string",
        description: "The location to get weather for"
      }
    },
    required: ["location"]
  }
}
```

### Capability Negotiation

Current implementation has basic connection capabilities but lacks formal capability exchange. The planned enhancement includes:

1. Defining explicit capability schemas
2. Implementing capability exchange during connection
3. Adding runtime checks for feature availability
4. Supporting version-specific behavior

See [Capability Negotiation Plan](capability-negotiation.md) for implementation details.

### Resources (Planned)

Resources will allow Mistral to access read-only data from MCP servers. The planned implementation will:

1. Discover available resources from servers
2. Fetch resource content when requested
3. Incorporate resource data into Mistral context
4. Support pagination for large resources

### Prompts (Planned)

Prompts will provide reusable templates for Mistral interactions. The planned implementation will:

1. Discover available prompts from servers
2. Fill prompt templates with arguments
3. Use completed prompts in Mistral conversations
4. Allow users to select and use prompts through the UI

## Transport Options

MCP supports multiple transport mechanisms:

| Transport | Status | Description |
|-----------|--------|-------------|
| Stdio | ✅ Implemented | Standard input/output for local servers |
| HTTP/SSE | ❌ Missing | HTTP with Server-Sent Events for remote servers |
| WebSockets | ❌ Missing | For bidirectional communication |

## Security Considerations

The MCP protocol emphasizes several security principles that our implementation should follow:

1. **User Consent and Control**
   - Users must explicitly approve all data access and operations
   - UI should provide clear consent mechanisms

2. **Data Privacy**
   - User data must be protected with appropriate controls
   - Explicit consent required for data sharing

3. **Tool Safety**
   - Tools represent arbitrary code execution paths
   - Users should understand what each tool does before authorizing use

4. **LLM Sampling Controls**
   - Users must explicitly approve any LLM sampling requests
   - Users should control whether sampling occurs at all
