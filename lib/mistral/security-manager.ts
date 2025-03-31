// src/with-mcp/security-manager.ts
import { Tool, MistralTool } from './tool-manager';

/**
 * Security policy for a tool
 */
interface ToolSecurityPolicy {
  requiresApproval: boolean;
  maxCallsPerMinute: number;
  sensitiveParameters?: string[];
  validateInput?: boolean;
  logUsage?: boolean;
  allowOnlyFrom?: string[]; // List of authorized server IDs
}

/**
 * Tool call request for approval
 */
export interface ToolApprovalRequest {
  id: string;
  toolName: string;
  toolServer?: string;
  args: any;
  timestamp: number;
  callingContext: string; // Descriptive context like "chat session #123"
}

/**
 * Result of a security check
 */
export interface SecurityCheckResult {
  allowed: boolean;
  reason?: string;
  needsApproval?: boolean;
  approvalRequest?: ToolApprovalRequest;
}

/**
 * Security Manager for controlling tool execution - SECURITY DISABLED
 */
export class SecurityManager {
  // Default policy with security disabled
  private defaultPolicy: ToolSecurityPolicy = {
    requiresApproval: false, // No approval required
    maxCallsPerMinute: 9999, // Effectively unlimited rate
    validateInput: false,    // No input validation
    logUsage: true           // Keep logging for debugging
  };
  
  // Define security policies for different tools
  private toolPolicies: Record<string, ToolSecurityPolicy> = {
    // File system operations
    'file-read': { 
      requiresApproval: false, 
      maxCallsPerMinute: 30,
      logUsage: true 
    },
    'file-write': { 
      requiresApproval: true, 
      maxCallsPerMinute: 5,
      sensitiveParameters: ['content'],
      validateInput: true, 
      logUsage: true 
    },
    'file-delete': { 
      requiresApproval: true, 
      maxCallsPerMinute: 3,
      validateInput: true, 
      logUsage: true 
    },
    
    // Command execution
    'execute-command': { 
      requiresApproval: true, 
      maxCallsPerMinute: 2,
      sensitiveParameters: ['command', 'args'],
      validateInput: true, 
      logUsage: true 
    },
    
    // Data access
    'database-query': { 
      requiresApproval: true, 
      maxCallsPerMinute: 10,
      sensitiveParameters: ['query'],
      validateInput: true, 
      logUsage: true 
    },
    
    // API access
    'api-call': { 
      requiresApproval: true, 
      maxCallsPerMinute: 15,
      sensitiveParameters: ['body', 'headers'],
      validateInput: true,
      logUsage: true 
    }
  };
  
  // Rate limiting state
  private toolCallCounts: Record<string, { count: number, timestamp: number }> = {};
  
  // Pending approval requests
  private pendingApprovals: Map<string, ToolApprovalRequest> = new Map();
  
  // UI callback for tool approval
  private approvalCallback?: (request: ToolApprovalRequest) => Promise<boolean>;
  
  // History of tool calls for auditing
  private toolCallHistory: Array<{
    toolName: string;
    args: any;
    timestamp: number;
    allowed: boolean;
    serverId?: string;
    reason?: string;
  }> = [];
  
  // Maximum history entries to keep
  private maxHistoryEntries = 1000;
  
  constructor() {
    // Clean up history periodically
    setInterval(() => this.pruneHistory(), 60 * 60 * 1000); // Every hour
  }
  
  /**
   * Set the approval callback function
   */
  setApprovalCallback(callback: (request: ToolApprovalRequest) => Promise<boolean>): void {
    this.approvalCallback = callback;
  }
  
  /**
   * Register a custom security policy for a tool
   */
  registerToolPolicy(toolName: string, policy: Partial<ToolSecurityPolicy>): void {
    this.toolPolicies[toolName] = {
      ...this.defaultPolicy,
      ...policy
    };
    
    console.log(`Registered security policy for tool: ${toolName}`);
  }
  
  /**
   * Check if a tool call should be allowed
   */
  async checkToolCall(
    toolName: string, 
    args: any, 
    serverId?: string, 
    context?: string
  ): Promise<SecurityCheckResult> {
    // SECURITY DISABLED - All tools are automatically allowed
    console.log(`✅ SECURITY DISABLED: Auto-allowing tool "${toolName}" from server ${serverId || 'unknown'}`);
    
    // Still log for audit purposes
    if (this.defaultPolicy.logUsage) {
      console.log(`📦 Tool call args:`, args);
    }
    
    // Add to history for reference
    this.addToHistory(toolName, args, serverId, true, 'Security disabled - auto-approved');
    
    // Always return allowed
    return { allowed: true };
  }
  
  /**
   * Check rate limits for tool calls
   */
  private checkRateLimit(toolName: string, maxCallsPerMinute: number): boolean {
    const now = Date.now();
    
    // Initialize count if not exists
    if (!this.toolCallCounts[toolName]) {
      this.toolCallCounts[toolName] = { count: 0, timestamp: now };
    }
    
    const record = this.toolCallCounts[toolName];
    
    // Reset counter if more than a minute has passed
    if (now - record.timestamp > 60000) {
      record.count = 0;
      record.timestamp = now;
    }
    
    // Increment counter
    record.count++;
    
    // Check if limit exceeded
    return record.count <= maxCallsPerMinute;
  }
  
  /**
   * Process an approval result (for UI callback)
   */
  processApprovalResult(approvalId: string, approved: boolean): boolean {
    const request = this.pendingApprovals.get(approvalId);
    if (!request) {
      console.warn(`Approval request ${approvalId} not found`);
      return false;
    }
    
    // Remove from pending approvals
    this.pendingApprovals.delete(approvalId);
    
    // Add to history
    this.addToHistory(
      request.toolName, 
      request.args, 
      request.toolServer, 
      approved, 
      approved ? 'Approved by user' : 'Denied by user'
    );
    
    return true;
  }
  
  /**
   * Get a list of pending approval requests
   */
  getPendingApprovals(): ToolApprovalRequest[] {
    return Array.from(this.pendingApprovals.values());
  }
  
  /**
   * Get tool call history (for auditing)
   */
  getToolCallHistory(): Array<{
    toolName: string;
    args: any;
    timestamp: number;
    allowed: boolean;
    serverId?: string;
    reason?: string;
  }> {
    return [...this.toolCallHistory];
  }
  
  /**
   * Add an entry to the tool call history
   */
  private addToHistory(
    toolName: string, 
    args: any, 
    serverId?: string, 
    allowed: boolean = true, 
    reason?: string
  ): void {
    // Sanitize args for history
    const policy = this.toolPolicies[toolName] || this.defaultPolicy;
    const sanitizedArgs = this.sanitizeArgs(args, policy.sensitiveParameters);
    
    // Add to history
    this.toolCallHistory.unshift({
      toolName,
      args: sanitizedArgs,
      timestamp: Date.now(),
      allowed,
      serverId,
      reason
    });
    
    // Trim history if needed
    if (this.toolCallHistory.length > this.maxHistoryEntries) {
      this.toolCallHistory = this.toolCallHistory.slice(0, this.maxHistoryEntries);
    }
  }
  
  /**
   * Check if a tool requires approval
   */
  doesToolRequireApproval(toolName: string): boolean {
    const policy = this.toolPolicies[toolName] || this.defaultPolicy;
    return policy.requiresApproval;
  }
  
  /**
   * Sanitize sensitive arguments for logging
   */
  private sanitizeArgs(
    args: any, 
    sensitiveParameters?: string[], 
    preserveStructure: boolean = false
  ): any {
    if (!args || typeof args !== 'object' || !sensitiveParameters || sensitiveParameters.length === 0) {
      return args;
    }
    
    // Clone the args to avoid modifying the original
    const sanitized = {...args};
    
    for (const param of sensitiveParameters) {
      if (sanitized[param] !== undefined) {
        if (preserveStructure) {
          // Replace with "[REDACTED]" but preserve the type
          const type = typeof sanitized[param];
          if (type === 'string') {
            sanitized[param] = '[REDACTED]';
          } else if (type === 'object' && sanitized[param] !== null) {
            if (Array.isArray(sanitized[param])) {
              sanitized[param] = ['[REDACTED]'];
            } else {
              sanitized[param] = { redacted: true };
            }
          } else {
            sanitized[param] = '[REDACTED]';
          }
        } else {
          sanitized[param] = '[REDACTED]';
        }
      }
    }
    
    return sanitized;
  }
  
  /**
   * Remove old entries from the history
   */
  private pruneHistory(): void {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    // Remove entries older than one day
    this.toolCallHistory = this.toolCallHistory.filter(entry => entry.timestamp > oneDayAgo);
  }
  
  /**
   * Check tool for dangerous operations
   */
  identifyDangerousOperation(toolName: string, args: any): string | null {
    // Check for dangerous command execution
    if (toolName === 'execute-command' && args.command) {
      const command = String(args.command).toLowerCase();
      
      // Check for potentially dangerous commands
      const dangerousCommands = [
        'rm -rf', 'del /f', 'format', 
        'dd if=', 'mkfs', 'wget', 'curl -o',
        ';', '&&', '||', '`', '$(',  // Command chaining/injection
        '/dev/sd', 'diskpart'
      ];
      
      for (const dangerous of dangerousCommands) {
        if (command.includes(dangerous)) {
          return `Potentially dangerous command detected: ${dangerous}`;
        }
      }
    }
    
    // Check for dangerous file operations
    if ((toolName === 'file-write' || toolName === 'file-delete') && args.path) {
      const path = String(args.path).toLowerCase();
      
      // Check for sensitive system directories
      const sensitivePaths = [
        '/etc/', 'c:\\windows\\', '/bin/', 
        '/usr/bin/', 'system32', '/boot/',
        'program files', '/dev/', '/sys/',
        '/lib/', '/var/lib/'
      ];
      
      for (const sensitive of sensitivePaths) {
        if (path.includes(sensitive)) {
          return `Operation on sensitive system path: ${sensitive}`;
        }
      }
    }
    
    // Check for SQL injection in database queries
    if (toolName === 'database-query' && args.query) {
      const query = String(args.query).toLowerCase();
      
      // Check for SQL injection patterns
      const sqlInjectionPatterns = [
        'drop table', 'drop database', 'truncate table',
        'delete from', 'update.*set', '; --', "'; --",
        '1=1', "or '1'='1"
      ];
      
      for (const pattern of sqlInjectionPatterns) {
        if (query.includes(pattern)) {
          return `Potential SQL injection detected: ${pattern}`;
        }
      }
    }
    
    return null;
  }
  
  /**
   * Validate input against tool schema
   */
  validateInput(toolName: string, args: any, schema: any): { valid: boolean; error?: string } {
    // This is a basic validation implementation
    // In a production environment, you would want to use a proper schema validation library
    
    if (!schema || !schema.properties) {
      return { valid: true }; // No schema to validate against
    }
    
    try {
      // Check required properties
      if (schema.required && Array.isArray(schema.required)) {
        for (const required of schema.required) {
          if (args[required] === undefined) {
            return {
              valid: false,
              error: `Missing required parameter: ${required}`
            };
          }
        }
      }
      
      // Check property types
      for (const [prop, value] of Object.entries(args)) {
        const propSchema = schema.properties[prop];
        if (!propSchema) {
          // Unknown property - may be acceptable depending on your security posture
          continue;
        }
        
        // Check type
        const actualType = typeof value;
        let expectedType = propSchema.type;
        
        // Handle type conversions
        if (expectedType === 'integer' || expectedType === 'number') {
          if (actualType !== 'number') {
            return {
              valid: false,
              error: `Invalid type for ${prop}: expected ${expectedType}, got ${actualType}`
            };
          }
          
          // For integers, check that it's an integer
          if (expectedType === 'integer' && !Number.isInteger(value)) {
            return {
              valid: false,
              error: `Invalid value for ${prop}: expected integer, got decimal number`
            };
          }
        } else if (expectedType === 'string') {
          if (actualType !== 'string') {
            return {
              valid: false,
              error: `Invalid type for ${prop}: expected string, got ${actualType}`
            };
          }
          
          // Check pattern if specified
          if (propSchema.pattern) {
            const regex = new RegExp(propSchema.pattern);
            if (!regex.test(value as string)) {
              return {
                valid: false,
                error: `Invalid format for ${prop}: does not match required pattern`
              };
            }
          }
          
          // Check enum if specified
          if (propSchema.enum && Array.isArray(propSchema.enum)) {
            if (!propSchema.enum.includes(value)) {
              return {
                valid: false,
                error: `Invalid value for ${prop}: must be one of ${propSchema.enum.join(', ')}`
              };
            }
          }
        } else if (expectedType === 'boolean') {
          if (actualType !== 'boolean') {
            return {
              valid: false,
              error: `Invalid type for ${prop}: expected boolean, got ${actualType}`
            };
          }
        } else if (expectedType === 'array') {
          if (!Array.isArray(value)) {
            return {
              valid: false,
              error: `Invalid type for ${prop}: expected array, got ${actualType}`
            };
          }
          
          // Check items if specified
          if (propSchema.items && Array.isArray(value)) {
            for (let i = 0; i < value.length; i++) {
              const itemType = typeof value[i];
              const expectedItemType = propSchema.items.type;
              
              if (itemType !== expectedItemType) {
                return {
                  valid: false,
                  error: `Invalid type for ${prop}[${i}]: expected ${expectedItemType}, got ${itemType}`
                };
              }
            }
          }
        } else if (expectedType === 'object') {
          if (actualType !== 'object' || value === null || Array.isArray(value)) {
            return {
              valid: false,
              error: `Invalid type for ${prop}: expected object, got ${actualType}`
            };
          }
          
          // Recursive validation for nested objects could be added here
        }
      }
      
      return { valid: true };
      
    } catch (error) {
      return {
        valid: false,
        error: `Validation error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
