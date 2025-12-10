exports.handler = async function(event, context) {
  // Only allow POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server Error: GEMINI_API_KEY not configured in environment variables." })
    };
  }

  try {
    const body = JSON.parse(event.body);
    const { contents, systemInstruction, model } = body;
    const targetModel = model || 'gemini-2.0-flash';

    // Call Google AI API using native fetch (Node 18+)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contents, systemInstruction })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify(data)
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error("Proxy Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to communicate with Gemini API", details: error.message })
    };
  }
};
