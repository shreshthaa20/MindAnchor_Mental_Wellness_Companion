"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const ragServiceUrl_1 = require("../utils/ragServiceUrl");
const ragServiceAuth_1 = require("../utils/ragServiceAuth");
// Calls the Python RAG service's /embed endpoint, which uses Gemini
// (google.generativeai) under the hood — the SAME embedding model
// used by live semantic search, so seeded documents and search
// queries end up in the same vector space and can be compared.
const getEmbedding = async (text) => {
    const url = `${(0, ragServiceUrl_1.getRAGServiceUrl)()}/embed`;
    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(0, ragServiceAuth_1.getRAGServiceAuthHeaders)() },
        body: JSON.stringify({ text }),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Embedding request failed (${response.status}): ${errorBody}`);
    }
    const data = await response.json();
    return data.embedding;
};
const wellnessSeedDocuments = [
    {
        category: "Mental Health",
        title: "WHO Mental Health Support Principles",
        source: "WHO Mental Health Resources",
        tags: ["mental health", "support", "professional care"],
        content: "Mental health support should promote dignity, connection, practical help, and access to qualified care when symptoms are severe or safety is at risk. Wellness tools can support daily coping but do not replace professional assessment or emergency care.",
    },
    {
        category: "Mental Health",
        title: "NIMH-Informed Help-Seeking Guidance",
        source: "National Institute of Mental Health",
        tags: ["help seeking", "crisis", "professional support"],
        content: "People experiencing severe distress, thoughts of self-harm, suicidal thoughts, or inability to function safely should be encouraged to contact emergency services, crisis support, or a qualified healthcare professional. Supportive apps should avoid diagnosis and encourage human support.",
    },
    {
        category: "Mental Health",
        title: "CBT Thought Check Exercise",
        source: "CBT Skills",
        tags: ["cbt", "thoughts", "stress"],
        content: "A simple CBT-style reflection asks the user to name the situation, identify the automatic thought, notice the emotion and body response, look for evidence for and against the thought, and choose a more balanced next thought.",
    },
    {
        category: "Mental Health",
        title: "Anxiety Management Basics",
        source: "Anxiety Management",
        tags: ["anxiety", "grounding", "breathing"],
        content: "General anxiety coping may include slow breathing, grounding through the senses, reducing caffeine late in the day, writing down worries, scheduling a small next step, and reaching out to a trusted person when anxiety feels overwhelming.",
    },
    {
        category: "Mental Health",
        title: "Stress and Burnout Prevention",
        source: "Stress Management",
        tags: ["stress", "burnout", "boundaries"],
        content: "Stress management can include identifying stressors, setting realistic boundaries, taking short recovery breaks, prioritizing sleep, reducing overload, and breaking tasks into smaller steps. Burnout prevention emphasizes rest, workload review, and support.",
    },
    {
        category: "Nutrition & Lifestyle",
        title: "Healthy Daily Routine Basics",
        source: "Healthy Daily Routines",
        tags: ["routine", "hydration", "activity"],
        content: "A sustainable daily routine may include hydration, regular meals, short physical activity, planned breaks, time outdoors when possible, and a small evening reset. Recommendations should fit the user's energy and constraints.",
    },
    {
        category: "Emergency Resources",
        title: "Crisis Support Guidance",
        source: "Emergency Contact Guidance",
        tags: ["crisis", "emergency", "safety"],
        content: "If a user may be in immediate danger, considering suicide, or unable to stay safe, they should be encouraged to contact local emergency services now, reach out to a trusted person nearby, or use local crisis support resources.",
    },
];
const toVectorLiteral = (embedding) => {
    return `[${embedding.join(",")}]`;
};
const seedWellnessKnowledgeBase = async () => {
    await database_1.pool.query("BEGIN");
    try {
        await database_1.pool.query("DELETE FROM knowledge_base WHERE is_curated = true");
        for (const document of wellnessSeedDocuments) {
            const embedding = await getEmbedding(`${document.category}\n${document.title}\n${document.content}`);
            if (!embedding) {
                throw new Error(`Missing embedding for ${document.title}`);
            }
            await database_1.pool.query(`
        INSERT INTO knowledge_base
          (user_id, category, title, content, source, tags, is_curated, embedding)
        VALUES (NULL, $1, $2, $3, $4, $5, true, $6::vector)
        `, [
                document.category,
                document.title,
                document.content,
                document.source,
                document.tags,
                toVectorLiteral(embedding),
            ]);
        }
        await database_1.pool.query("COMMIT");
        console.log(`Seeded ${wellnessSeedDocuments.length} curated wellness documents.`);
    }
    catch (error) {
        await database_1.pool.query("ROLLBACK");
        throw error;
    }
    finally {
        await database_1.pool.end();
    }
};
seedWellnessKnowledgeBase().catch((error) => {
    console.error(error);
    process.exit(1);
});
