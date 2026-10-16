const dotenv = require("dotenv");
const path = require("path");

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, ".env") });

console.log("RAG_SERVICE_URL from env:", process.env.RAG_SERVICE_URL);

async function testCompanion() {
  if (!process.env.RAG_SERVICE_API_KEY) {
    throw new Error("RAG_SERVICE_API_KEY must be set in backend/.env");
  }
  const url = `${process.env.RAG_SERVICE_URL || "http://localhost:8000"}/chat`;
  console.log("Attempting fetch to:", url);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-API-Key": process.env.RAG_SERVICE_API_KEY,
      },
      body: JSON.stringify({
        user_id: 1,
        chat_type: "companion",
        messages: [
          { role: "user", content: "Hello, how are you today?" }
        ],
      }),
    });

    console.log("Response OK?", response.ok);
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Data:", data);
  } catch (error) {
    console.error("Fetch failed with error details:\n", error);
  }
}

testCompanion();
