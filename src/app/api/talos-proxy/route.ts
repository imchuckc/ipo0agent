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
      console.error(`Talos API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: `Failed to fetch from Talos: ${response.status} ${response.statusText}` },
        { status: response.status }
      );
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
        return NextResponse.json(
          { error: 'Authentication failed or invalid path. Received HTML instead of file content.' },
          { status: 401 }
        );
      }
      
      return new NextResponse(text, {
        headers: {
          'Content-Type': 'text/plain',
        },
      });
    }
    
    // If we get here, something unexpected happened
    return NextResponse.json(
      { error: 'Unexpected response format from Talos API' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error in Talos proxy API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 