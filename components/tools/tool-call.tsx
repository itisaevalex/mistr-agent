"use client";

interface ToolCallProps {
  name: string;
  args: string;
  result?: string;
}

export default function ToolCall({ name, args, result }: ToolCallProps) {
  // Parse the args string to an object
  let parsedArgs: Record<string, any> = {};
  
  try {
    parsedArgs = JSON.parse(args);
  } catch (error) {
    console.error('Failed to parse tool args:', error);
  }
  
  return (
    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-base dark:border-blue-900 dark:bg-blue-900/20 shadow-sm">
      <div className="flex items-center">
        <div className="mr-2 font-mono font-semibold text-blue-700 dark:text-blue-400">{name}</div>
        <div className="text-sm text-gray-500 dark:text-gray-400">Tool Call</div>
      </div>
      
      {/* Tool arguments */}
      <div className="mt-2">
        <div className="flex flex-wrap gap-2">
          {Object.entries(parsedArgs).map(([key, value]) => (
            <div key={key} className="rounded-md bg-white px-3 py-1 text-sm dark:bg-gray-800">
              <span className="font-medium text-gray-700 dark:text-gray-300">{key}:</span>{' '}
              <span className="text-blue-600 dark:text-blue-400">
                {typeof value === 'string' ? `"${value}"` : value}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Tool result, if available */}
      {result && (
        <div className="mt-3 rounded border border-green-200 bg-green-50 p-2 text-sm dark:border-green-900 dark:bg-green-900/20">
          <div className="font-medium text-gray-700 dark:text-gray-300">Result:</div>
          <div className="text-green-700 dark:text-green-400">{result}</div>
        </div>
      )}
    </div>
  );
}
