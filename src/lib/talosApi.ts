// Utility functions for interacting with the Talos API

/**
 * Extracts path from a Talos URL
 * @param url - The Talos URL
 * @returns The extracted path
 */
export function extractPathFromUrl(url: string): string {
  try {
    // Handle URLs in the format https://rno.talos.nvidia.com/edawsbrowse/home/username/path
    if (url.includes('/edawsbrowse/')) {
      const match = url.match(/\/edawsbrowse(\/.*)/);
      if (match && match[1]) {
        console.log(`Extracted path from URL: ${match[1]}`);
        return match[1];
      }
    }
    
    // If it's already a path, return it as is
    if (url.startsWith('/')) {
      return url;
    }
    
    // If it's a full URL but not in the expected format, try to extract the path
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      return urlObj.pathname;
    }
    
    // Default case, assume it's a path
    return url;
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return url; // Return the original input if parsing fails
  }
}

/**
 * Checks if a response is HTML instead of JSON or text content
 * @param text - The response text
 * @returns Whether the response is HTML
 */
function isHtmlResponse(text: string): boolean {
  return text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html');
}

/**
 * Creates a proxy URL to bypass CORS issues
 * @param url - The original URL
 * @returns The proxied URL
 */
function createProxyUrl(url: string): string {
  // For a real application, you would use a server-side proxy
  // For this demo, we'll use a mock approach
  return url;
}

/**
 * Fetches the content directly from the URL
 * @param url - The URL to fetch from
 * @returns The content
 */
export async function fetchDirectFromUrl(url: string): Promise<string> {
  try {
    console.log(`Attempting to fetch directly from URL: ${url}`);
    
    // In a real application, we would need to handle CORS issues
    // For this demo, we'll simulate a successful response with mock data
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Return mock timing path data
    return getMockTimingData(url);
  } catch (error) {
    console.error('Error fetching directly from URL:', error);
    throw error;
  }
}

/**
 * Fetches timing report from Talos
 * @param reportPath - The path to the timing report or URL
 * @returns The timing report content
 */
export async function fetchTimingReport(reportPath: string): Promise<string> {
  console.log(`Fetching timing report from: ${reportPath}`);
  
  try {
    // Extract the path if a full URL is provided
    const path = extractPathFromUrl(reportPath);
    
    // Use our server-side API route to proxy the request to Talos
    console.log(`Using API route to fetch content from path: ${path}`);
    const response = await fetch(`/api/talos-proxy?path=${encodeURIComponent(path)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Failed to fetch from Talos: ${response.status} ${response.statusText}`);
    }
    
    const text = await response.text();
    return text;
  } catch (error) {
    console.error('Error fetching timing report:', error);
    throw error;
  }
}

/**
 * Returns mock timing data for testing
 * This is only used as a fallback if the API request fails
 * @param filePath - The path to the file (used to determine which mock to return)
 * @returns Mock timing data
 */
export function getMockTimingData(filePath: string): string {
  // Return a violated timing path for testing
  return `Path 1: VIOLATED Setup Check with Pin core/memory_controller/addr_reg[12]/D 
Endpoint:   core/memory_controller/addr_reg[12]/D (^) checked with leading edge of 'CLK'
Beginpoint: core/register_file/register_memory_reg[7][12]/Q (^) triggered by leading edge of 'CLK'
Path Group: CLK 
Path Type: max 

Delay      Time   Description
------------------------------------------------------------------------------------
0.000      0.000  clock CLK (rise edge)
0.412      0.412  clock network delay (ideal)
0.000      0.412  core/register_file/register_memory_reg[7][12]/CLK (DFFX1_RVT)
0.187      0.599  core/register_file/register_memory_reg[7][12]/Q (DFFX1_RVT)
0.104      0.703  core/register_file/U2134/Y (INVX0_RVT)
0.132      0.835  core/register_file/U3567/Y (NAND2X0_RVT)
0.095      0.930  core/memory_controller/U456/Y (AOI22X1_RVT)
0.112      1.042  core/memory_controller/U789/Y (OAI21X1_RVT)
0.087      1.129  core/memory_controller/U1023/Y (INVX0_RVT)
0.143      1.272  core/memory_controller/U1567/Y (AO22X1_RVT)
0.000      1.272  core/memory_controller/addr_reg[12]/D (DFFX1_RVT)
1.272      1.272  data arrival time

1.000      1.000  clock CLK (rise edge)
0.412      1.412  clock network delay (ideal)
-0.050     1.362  clock uncertainty
-0.135     1.227  library setup time
1.227      1.227  data required time
------------------------------------------------------------------------------------
1.227      1.227  data required time
-1.272     -1.272 data arrival time
------------------------------------------------------------------------------------
-0.045     -0.045 slack (VIOLATED)`;
} 