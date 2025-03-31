import { ProtocolVersion } from '../mcp-types';

/**
 * Utility for handling MCP protocol version compatibility
 */
export class VersionCompatibility {
  /**
   * Parse a version string (either semver or ISO date) into a ProtocolVersion object
   */
  static parseVersion(versionStr: string): ProtocolVersion {
    // Handle ISO date format (YYYY-MM-DD)
    if (this.isIsoDateFormat(versionStr)) {
      const date = new Date(versionStr);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid ISO date format: ${versionStr}`);
      }
      
      // Convert date to version:
      // - major: year - 2020 (to make numbers smaller)
      // - minor: month
      // - patch: day
      return {
        major: date.getFullYear() - 2020,
        minor: date.getMonth() + 1,
        patch: date.getDate()
      };
    }
    
    // Handle semver format (x.y.z)
    if (this.isSemverFormat(versionStr)) {
      const parts = versionStr.split('.').map(Number);
      return {
        major: parts[0],
        minor: parts[1],
        patch: parts[2]
      };
    }
    
    throw new Error(`Unsupported version format: ${versionStr}`);
  }
  
  /**
   * Convert a ProtocolVersion object to a string
   */
  static versionToString(version: ProtocolVersion): string {
    return `${version.major}.${version.minor}.${version.patch}`;
  }
  
  /**
   * Check if two protocol versions are compatible
   */
  static isCompatible(clientVersion: ProtocolVersion, serverVersion: ProtocolVersion): boolean {
    // Major version must match exactly
    if (clientVersion.major !== serverVersion.major) {
      return false;
    }
    
    // Client minor version must be <= server minor version
    // This allows the server to be newer, but not the client
    if (clientVersion.minor > serverVersion.minor) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Compare two versions for compatibility and return result
   */
  static checkCompatibility(
    clientVersionStr: string, 
    serverVersionStr: string
  ): CompatibilityResult {
    try {
      const clientVersion = this.parseVersion(clientVersionStr);
      const serverVersion = this.parseVersion(serverVersionStr);
      
      // Exact match
      if (this.versionToString(clientVersion) === this.versionToString(serverVersion)) {
        return {
          compatible: true,
          useVersion: this.versionToString(clientVersion),
          reason: 'Exact version match'
        };
      }
      
      // Check compatibility
      const compatible = this.isCompatible(clientVersion, serverVersion);
      
      if (compatible) {
        // Determine which version to use (typically the server's)
        const useVersion = this.negotiateVersion(clientVersion, serverVersion);
        
        // Client is newer than server
        if (
          clientVersion.minor > serverVersion.minor || 
          (clientVersion.minor === serverVersion.minor && clientVersion.patch > serverVersion.patch)
        ) {
          return {
            compatible: true,
            useVersion: this.versionToString(useVersion),
            reason: 'Client is newer but backward compatible',
            backwardCompatible: true
          };
        }
        
        // Server is newer than client
        return {
          compatible: true,
          useVersion: this.versionToString(useVersion),
          reason: 'Server is newer but forward compatible',
          forwardCompatible: true
        };
      }
      
      return {
        compatible: false,
        useVersion: null,
        reason: 'Incompatible protocol versions'
      };
    } catch (error) {
      return {
        compatible: false,
        useVersion: null,
        reason: error instanceof Error ? error.message : 'Unknown error parsing versions'
      };
    }
  }
  
  /**
   * Negotiate the highest compatible version between client and server
   */
  static negotiateVersion(clientVersion: ProtocolVersion, serverVersion: ProtocolVersion): ProtocolVersion {
    if (!this.isCompatible(clientVersion, serverVersion)) {
      throw new Error('Incompatible protocol versions');
    }
    
    return {
      major: clientVersion.major, // Major must be the same for compatibility
      minor: Math.min(clientVersion.minor, serverVersion.minor),
      patch: Math.min(clientVersion.patch, serverVersion.patch)
    };
  }
  
  /**
   * Check if version is in ISO date format (YYYY-MM-DD)
   */
  private static isIsoDateFormat(version: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(version);
  }
  
  /**
   * Check if version is in semantic versioning format (x.y.z)
   */
  private static isSemverFormat(version: string): boolean {
    return /^\d+\.\d+\.\d+$/.test(version);
  }
  
  /**
   * Get the feature set supported by a specific protocol version
   */
  static getFeatureSetForVersion(version: ProtocolVersion): Record<string, boolean> {
    const baseSet = {
      tools: false,
      resources: false,
      prompts: false,
      completion: false,
      streaming: false
    };
    
    // All versions support tools
    baseSet.tools = true;
    
    // Versions >= 0.1.0 support resources
    if (version.major > 0 || (version.major === 0 && version.minor >= 1)) {
      baseSet.resources = true;
    }
    
    // Versions >= 0.2.0 support prompts
    if (version.major > 0 || (version.major === 0 && version.minor >= 2)) {
      baseSet.prompts = true;
    }
    
    // Versions >= 0.3.0 support completion
    if (version.major > 0 || (version.major === 0 && version.minor >= 3)) {
      baseSet.completion = true;
    }
    
    // Versions >= 0.4.0 support streaming
    if (version.major > 0 || (version.major === 0 && version.minor >= 4)) {
      baseSet.streaming = true;
    }
    
    return baseSet;
  }
}

interface CompatibilityResult {
  compatible: boolean;
  useVersion: string | null;
  reason: string;
  backwardCompatible?: boolean;
  forwardCompatible?: boolean;
}