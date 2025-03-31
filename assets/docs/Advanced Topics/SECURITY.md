# Mistral MCP Adapter: Security Guide

## Overview

The Mistral MCP Adapter incorporates security mechanisms to control how Large Language Models (LLMs) can utilize external tools via MCP (Mistral Connector Protocol) servers. The primary goal is to prevent unintended or malicious tool usage while allowing legitimate, user-approved actions.

## Current Security Mechanism: User Tool Confirmation

As of the current implementation, the primary security layer is a **User Confirmation Flow**. This flow intercepts tool calls proposed by the LLM and requires explicit user approval before execution.

### How it Works:

1.  **Detection:** When the `McpAdapter` receives a response from the LLM containing one or more `tool_calls`, it detects this before executing them.
2.  **State Update:** The adapter updates the central `ConversationStore` for the specific conversation, setting the state to `awaiting_confirmation`.
3.  **Store Pending Data:** The original LLM response (containing the tool calls) and the list of pending `toolCalls` are stored in the `ConversationStore` associated with the conversation ID.
4.  **UI Notification:** The frontend UI, polling the `/api/state` endpoint, detects the `awaiting_confirmation` state and the presence of `pendingToolCalls`. It then presents a confirmation dialog to the user, displaying the tool(s) the LLM wants to use.
5.  **User Decision:** The user clicks either "Allow" or "Deny" in the UI.
6.  **API Call:** The UI sends the user's decision (allow/deny) along with the conversation ID to the `/api/tool_decision` endpoint.
7.  **Decision Handling:**
    *   The `/api/tool_decision` endpoint retrieves the conversation state and the original pending response from the `ConversationStore`.
    *   If **allowed**, it triggers the `McpAdapter.processToolCalls` method, passing the originally requested tool calls. The adapter then executes the tools via the `McpServerManager`, formats the results (using `formatToolResult`), and sends them back to the LLM for a final response.
    *   If **denied**, it informs the LLM that the tool call was denied by sending a pre-formatted tool message indicating denial. The LLM then typically responds acknowledging the denial.
8.  **State Reset:** After processing the decision (allow or deny), the conversation state is typically reset (e.g., back to `idle` or `streaming` depending on the LLM's final response).

### Key Components:

*   **`McpAdapter` ([`lib/mistral/mcp-adapter.ts`](../lib/mistral/mcp-adapter.ts)):** Orchestrates the LLM interaction, detects tool calls, interacts with the state store, and initiates tool execution or denial messages.
*   **`ConversationStore` ([`lib/conversation-store.ts`](../lib/conversation-store.ts)):** Centralized state management holding conversation history, current status (`state`), pending tool calls (`pendingToolCalls`), and the pending LLM response (`pendingResponse`).
*   **`/api/state` ([`app/api/state/route.ts`](../app/api/state/route.ts)):** Endpoint for the UI to poll the current state of a conversation.
*   **`/api/tool_decision` ([`app/api/tool_decision/route.ts`](../app/api/tool_decision/route.ts)):** Endpoint to receive the user's allow/deny decision and trigger the appropriate backend action.
*   **`ChatbotStateIndicator` ([`components/ui/chatbot-state-indicator.tsx`](../components/ui/chatbot-state-indicator.tsx)):** Frontend component responsible for polling state, displaying status, and rendering the confirmation dialog.
*   **`McpServerManager` ([`lib/mistral/mcp-server-manager.ts`](../lib/mistral/mcp-server-manager.ts)):** Handles the actual communication with the MCP server(s) to execute the tool call if allowed.
*   **`formatToolResult` (within `McpAdapter`):** Crucial function that formats the raw result received from the MCP server into a string suitable for the LLM. *Needs to be adapted if MCP servers use different result structures.*

## Legacy SecurityManager (Currently Disabled)

The codebase also contains a `SecurityManager` class ([`lib/mistral/security-manager.ts`](../lib/mistral/security-manager.ts)). This class was designed for a more automated policy-based approach:

*   **Policies:** Define rules (allow/deny, rate limits) per tool or globally.
*   **Approval Callback:** Intended to integrate with an approval mechanism (potentially the user confirmation flow or an admin dashboard).
*   **History/Rate Limiting:** Track tool usage counts.

**Current Status:** The `SecurityManager`'s checks within `McpAdapter` are currently **bypassed** (commented out or hardcoded to allow) in favor of the explicit User Confirmation Flow described above.

**Future Integration:** The User Confirmation Flow could potentially be integrated *with* the `SecurityManager` in the future. For example:

1.  `SecurityManager` performs initial checks (rate limits, basic policies).
2.  If allowed by policy, it could then trigger the User Confirmation Flow via its `approvalCallback` for final user consent.
3.  If denied by policy, the user confirmation might be skipped entirely.

## Debugging Tool Execution

When troubleshooting issues with tool calls (like incorrect results):

1.  **Check `McpAdapter` Logs:** Look for logs around `executeToolCalls`:
    *   `[ExecuteToolCalls] About to call serverManager.callTool...`: Confirms the call is being attempted.
    *   `[ExecuteToolCalls] RAW response received...`: Shows the exact data structure returned by the `McpServerManager` (and thus the MCP server).
    *   `[ExecuteToolCalls] CAUGHT ERROR...`: Indicates an error during the `serverManager.callTool` promise.
2.  **Check `formatToolResult` Logs:**
    *   `[formatToolResult] Formatting result...`: Shows the raw data passed to the formatter.
    *   `[formatToolResult] Extracted text content...`: Confirms if it successfully parsed the expected structure.
    *   `[formatToolResult] Unexpected toolResult structure...`: Indicates the fallback logic was used.
3.  **Check Final Tool Message:** Examine the `content` of the `role: 'tool'` message being sent back to Mistral in the `[ProcessToolCalls-...] Finished executing tools. Results: [...]` log.
4.  **Check MCP Server Logs:** Add logging within the Python MCP server script itself (e.g., the `perplexity-mcp` script) to see the request arguments it receives and the response it sends back.

## Security Model

The Mistral MCP Adapter includes a comprehensive security model to protect against potential risks when integrating with external tools. The security features include:

1.  **Human-in-the-loop approval** for sensitive operations
2.  **Input validation** for tool arguments
3.  **Rate limiting** to prevent abuse
4.  **Dangerous operation detection** to identify risky commands
5.  **Secure logging** of tool activities
6.  **Audit trail** of tool calls

## Security Manager

The core of the security system is the `SecurityManager` class, which handles:

- Tool security policies
- Approval workflows
- Rate limiting
- Input validation
- Audit logging

### Tool Security Policies

Each tool has a security policy that defines:

- Whether the tool requires human approval
- Maximum calls allowed per minute
- Which parameters are considered sensitive
- Whether input validation is required
- Whether usage should be logged

Default policies are provided for common tool types:

| Tool Type | Requires Approval | Rate Limit | Input Validation |
|-----------|-------------------|------------|------------------|
| File Reading | No | 30/min | Yes |
| File Writing | Yes | 5/min | Yes |
| Command Execution | Yes | 2/min | Yes |
| Database Query | Yes | 10/min | Yes |
| API Call | Yes | 15/min | Yes |
| Other Tools | No | 20/min | Yes |

## Human-in-the-Loop Approval

For sensitive operations, the adapter will present an approval dialog to the user:

1.  The LLM requests to execute a sensitive tool
2.  The SecurityManager intercepts the request
3.  An approval dialog is shown to the user
4.  The user can approve or deny the operation
5.  The result is returned to the LLM

### Automatic Denials

Some operations are automatically denied:

- Commands that could damage the system (e.g., `rm -rf`, format commands)
- Operations on sensitive system paths
- Potential SQL injection attempts
- Commands with suspicious patterns

## Input Validation

The adapter validates all tool inputs before execution:

1.  Required parameters are checked
2.  Parameter types are validated
3.  Suspicious input patterns are detected
4.  Minimum/maximum values are enforced
5.  Enum values are validated

## How to Use Security Features

### In Your Application

```jsx
import { SecurityProvider } from '../components/tools/security-integration';
import { createSecurityManager } from '../lib/mistral/utils/security-utils';

function MyApp() {
  // Create a security manager
  const securityManager = createSecurityManager();
  
  return (
    <SecurityProvider securityManager={securityManager}>
      <ChatInterface />
    </SecurityProvider>
  );
}
```

### Customizing Security Policies

You can customize security policies for specific tools:

```typescript
// Make a specific tool require approval
securityManager.registerToolPolicy('my-custom-tool', {
  requiresApproval: true,
  maxCallsPerMinute: 5,
  sensitiveParameters: ['apiKey', 'accessToken'],
  validateInput: true,
  logUsage: true
});

// Make a tool less restrictive
securityManager.registerToolPolicy('calculator', {
  requiresApproval: false,
  maxCallsPerMinute: 100
});
```

### Accessing Security History

The security manager keeps a history of tool calls for auditing:

```typescript
// Get tool call history
const history = securityManager.getToolCallHistory();

// Display in your UI
function SecurityHistory() {
  const [history, setHistory] = useState([]);
  
  useEffect(() => {
    // Get history from the security manager
    setHistory(securityManager.getToolCallHistory());
  }, []);
  
  return (
    <div>
      <h2>Tool Call History</h2>
      <table>
        {/* Render history */}
      </table>
    </div>
  );
}
```

## Best Practices

1.  **Always use the SecurityProvider**: Wrap your application with the SecurityProvider to ensure all tool calls are properly secured.

2.  **Review tool call history**: Periodically review the tool call history to identify potential issues.

3.  **Customize policies for your needs**: Adjust the security policies based on your specific security requirements.

4.  **Test with dangerous inputs**: Test the security system with potentially dangerous inputs to verify it's working correctly.

5.  **Regularly update policies**: As new tools are added, ensure they have appropriate security policies.

## Troubleshooting

### Tool Calls Being Denied

If tool calls are being denied unexpectedly:

1.  Check the tool security policy
2.  Look for suspicious patterns in the input
3.  Verify rate limits haven't been exceeded
4.  Check the security logs for specific denial reasons

### Approval Dialog Not Showing

If the approval dialog isn't appearing for sensitive operations:

1.  Verify the SecurityProvider is properly set up
2.  Check if the tool has the `requiresApproval` flag set
3.  Ensure the React component tree includes the SecurityIntegration component

### Rate Limiting Issues

If you're experiencing rate limiting issues:

1.  Check the configured rate limits for the tools
2.  Consider increasing limits for frequently used tools
3.  Look for possible infinite loops or repeated calls in the LLM's logic
