export async function handler(event, context) {
  try {
    if (event.httpMethod === "POST") {
      const data = JSON.parse(event.body);
      console.log("Received water level:", data.level);

      // Save latest value in global memory (volatile, resets if function container restarts)
      global.latestLevel = data.level;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Data received", receivedLevel: data.level }),
      };
    }

    if (event.httpMethod === "GET") {
      return {
        statusCode: 200,
        body: JSON.stringify({ latestLevel: global.latestLevel || null }),
      };
    }

    return { statusCode: 405, body: "Method Not Allowed" };
  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 400, body: "Invalid JSON" };
  }
}
