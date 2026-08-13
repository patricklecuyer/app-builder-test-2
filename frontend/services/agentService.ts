import { BASE_URL } from '../constants.ts';
import { SessionResponse, StreamEvent } from '../types.ts';

/**
 * Creates a new session with the agent.
 */
export async function createSession(userId: string): Promise<string> {
  const response = await fetch(`${BASE_URL}:query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      classMethod: 'async_create_session',
      input: {
        user_id: userId,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create session: ${response.status} - ${errText}`);
  }

  const data = (await response.json()) as SessionResponse;
  if (!data?.output?.id) {
    throw new Error('Invalid session response format');
  }
  
  return data.output.id;
}

/**
 * Streams a query to the agent and invokes a callback for each text chunk.
 */
export async function streamQuery(
  userId: string,
  sessionId: string,
  message: string,
  onChunk: (text: string) => void
): Promise<void> {
  const response = await fetch(`${BASE_URL}:streamQuery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      classMethod: 'async_stream_query',
      input: {
        user_id: userId,
        session_id: sessionId,
        message: message,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Stream query failed: ${response.status} - ${errText}`);
  }

  if (!response.body) {
    throw new Error('Response body is null');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  // Using for await...of as explicitly requested for this API
  // @ts-ignore - Suppress TS error if environment doesn't natively type ReadableStream as AsyncIterable
  for await (const chunk of response.body) {
    const chunkText = decoder.decode(chunk, { stream: true });
    buffer += chunkText;

    // Attempt to parse the buffer. The API might send NDJSON or complete JSON objects.
    try {
      // Try parsing the entire buffer first (if it's a single complete JSON object)
      const event = JSON.parse(buffer) as StreamEvent;
      if (event.content?.parts?.[0]?.text) {
        onChunk(event.content.parts[0].text);
      }
      buffer = ''; // Clear buffer on success
    } catch (e) {
      // If parsing fails, it might be incomplete or NDJSON (multiple lines)
      const lines = buffer.split('\n');
      if (lines.length > 1) {
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;
          
          try {
            const event = JSON.parse(trimmedLine) as StreamEvent;
            if (event.content?.parts?.[0]?.text) {
              onChunk(event.content.parts[0].text);
            }
          } catch (err) {
            console.warn('Failed to parse stream line as JSON:', trimmedLine);
          }
        }
      }
    }
  }

  // Process any remaining data in the buffer when the stream ends
  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer.trim()) as StreamEvent;
      if (event.content?.parts?.[0]?.text) {
        onChunk(event.content.parts[0].text);
      }
    } catch (e) {
      // Ignore final parse error if it's just trailing whitespace or malformed end
    }
  }
}
