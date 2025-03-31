/**
 * Tool call logger for debugging MCP communication
 */

export class ToolLogger {
  private static instance: ToolLogger;
  private enabled: boolean = true;
  
  private constructor() {}
  
  public static getInstance(): ToolLogger {
    if (!ToolLogger.instance) {
      ToolLogger.instance = new ToolLogger();
    }
    return ToolLogger.instance;
  }
  
  public enable(): void {
    this.enabled = true;
    console.log('Tool logging enabled');
  }
  
  public disable(): void {
    this.enabled = false;
    console.log('Tool logging disabled');
  }
  
  public log(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.log(`[TOOL] ${message}`, ...args);
    }
  }
  
  public warn(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.warn(`[TOOL WARNING] ${message}`, ...args);
    }
  }
  
  public error(message: string, ...args: any[]): void {
    if (this.enabled) {
      console.error(`[TOOL ERROR] ${message}`, ...args);
    }
  }
  
  public logToolCall(name: string, args: any, server?: string): void {
    if (this.enabled) {
      console.log(`[TOOL CALL] ${name} from ${server || 'unknown server'}`, args);
    }
  }
  
  public logToolResponse(name: string, response: any): void {
    if (this.enabled) {
      console.log(`[TOOL RESPONSE] ${name}`, response);
    }
  }
}

// Export a singleton instance
export const toolLogger = ToolLogger.getInstance();
