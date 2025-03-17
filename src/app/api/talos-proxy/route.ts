import { NextRequest, NextResponse } from 'next/server';

/**
 * API route handler for proxying requests to the Talos API
 * This handles authentication and CORS issues by making the request from the server
 */
export async function GET(request: NextRequest) {
  try {
    // Get the path from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path');
    
    if (!path) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }
    
    console.log(`Proxying request to Talos for path: ${path}`);
    
    // Get the API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_TALOS_API;
    
    if (!apiKey) {
      console.error('NEXT_PUBLIC_TALOS_API is not defined in environment variables');
      return NextResponse.json(
        { error: 'API key is not configured. Please set NEXT_PUBLIC_TALOS_API in environment variables.' },
        { status: 500 }
      );
    }
    
    // Check if we're in a deployed environment (Vercel)
    const isVercel = process.env.VERCEL === '1';
    
    try {
      // Construct the full URL to the Talos API
      // Try direct file access instead of using the contents API
      const talosBaseUrl = 'https://rno.talos.nvidia.com';
      const url = `${talosBaseUrl}${path}`;
      
      console.log(`Making request to: ${url}`);
      
      // Make the request to Talos with authentication
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/plain,application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch from Talos: ${response.status} ${response.statusText}`);
      }
      
      // Try to determine the content type from the response
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        try {
          // If it's JSON, parse it and handle different formats
          const jsonResponse = await response.json();
          
          if (Array.isArray(jsonResponse)) {
            // The contents API returns an array of line objects
            // Each line has a 'line' property with the text content
            const content = jsonResponse.map((line: any) => line.line).join('\n');
            
            return new NextResponse(content, {
              headers: {
                'Content-Type': 'text/plain',
              },
            });
          } else if (typeof jsonResponse === 'object') {
            // Handle other JSON response formats
            // If it has a content or text field, use that
            if (jsonResponse.content) {
              return new NextResponse(jsonResponse.content, {
                headers: {
                  'Content-Type': 'text/plain',
                },
              });
            } else {
              // Otherwise, stringify the JSON for display
              return new NextResponse(JSON.stringify(jsonResponse, null, 2), {
                headers: {
                  'Content-Type': 'text/plain',
                },
              });
            }
          }
        } catch (error) {
          // If JSON parsing fails, treat it as text
          const text = await response.text();
          return new NextResponse(text, {
            headers: {
              'Content-Type': 'text/plain',
            },
          });
        }
      } else {
        // If it's not JSON, return it as plain text
        const text = await response.text();
        
        // Check if we received HTML instead of the expected content
        if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
          console.error('Received HTML response from Talos API');
          throw new Error('Authentication failed or invalid path. Received HTML instead of file content.');
        }
        
        return new NextResponse(text, {
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      }
    } catch (error) {
      // If we're in a deployed environment or the error is related to network/access
      console.error('Error accessing Talos API:', error);
      
      // Return mock data for demonstration purposes
      return new NextResponse(getMockTimingData(path), {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
  } catch (error) {
    console.error('Error in Talos proxy API route:', error);
    return NextResponse.json(
      { error: 'Internal server error. Make sure you are connected to NVIDIA VPN to access Talos.' },
      { status: 500 }
    );
  }
}

/**
 * Returns mock timing data for testing
 * @param filePath - The path to the file (used to determine which mock to return)
 * @returns Mock timing data
 */
function getMockTimingData(filePath: string): string {
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
-0.045     -0.045 slack (VIOLATED)

[MOCK DATA] This is sample data for demonstration. Connect to NVIDIA VPN to access real data.`;
} 