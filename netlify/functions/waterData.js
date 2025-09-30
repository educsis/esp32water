let latestWaterLevel = 0;

export async function handler(event, context) {
  if(event.httpMethod === "POST"){
    try {
      const data = JSON.parse(event.body);
      console.log("Received water level:", data.level);
      latestWaterLevel = data.level;

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Data received", receivedLevel: data.level }),
      };
    } catch (err) {
      return { statusCode: 400, body: "Invalid JSON" };
    }
  } else if(event.httpMethod === "GET"){
    return {
      statusCode: 200,
      body: JSON.stringify({ latestLevel: latestWaterLevel }),
    };
  } else {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
}
