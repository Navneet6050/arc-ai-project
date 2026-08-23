require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const memoryWriter = require('./tools/memoryWriter');
const memoryRecall = require('./tools/memoryRecall');
const { getNamespace } = require('./services/workspaceIndexService');

async function runTest() {
  const results = {
    embedding: 'FAIL',
    upsert: 'FAIL',
    search: 'FAIL',
    recall: 'FAIL',
    cleanup: 'FAIL',
    overall: 'FAIL'
  };

  const testUser = { userId: "test_e2e_user_" + Date.now(), workspaceId: null };
  const namespace = getNamespace(testUser.userId, testUser.workspaceId);
  const testContent = "This is a temporary diagnostic test memory vector. The secret keyword is E2E_RAG_SUCCESS_KEY.";

  console.log(`Starting E2E RAG Test in namespace: ${namespace}`);
  let pc;
  let index;

  try {
    // 1. & 2. Upsert (Embedding + Pinecone Write)
    const writeResult = await memoryWriter.execute({ content: testContent, tags: "test, e2e" }, testUser);
    
    if (writeResult && writeResult.success) {
      results.embedding = 'PASS';
      results.upsert = 'PASS';
    } else {
      throw new Error("Write failed: " + JSON.stringify(writeResult));
    }

    // Delay briefly to ensure Pinecone indexing (eventual consistency)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. & 4. Search (Pinecone Read + Recall)
    const recallResult = await memoryRecall.execute({ searchQuery: "diagnostic test memory keyword" }, testUser);
    
    if (recallResult && recallResult.retrieved_data && recallResult.retrieved_data.includes("E2E_RAG_SUCCESS_KEY")) {
      results.search = 'PASS';
      results.recall = 'PASS';
    } else {
      throw new Error("Recall failed or didn't contain target: " + JSON.stringify(recallResult));
    }

  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    try {
      // 5. & 6. Cleanup
      pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
      index = pc.index(process.env.PINECONE_INDEX || 'arc-brain');
      
      // Pinecone allows deleting an entire namespace if you don't know the specific ID
      await index.namespace(namespace).deleteAll();
      
      // Verify cleanup
      await new Promise(resolve => setTimeout(resolve, 3000));
      const stats = await index.describeIndexStats();
      if (!stats.namespaces || !stats.namespaces[namespace] || stats.namespaces[namespace].recordCount === 0) {
         results.cleanup = 'PASS';
      } else {
         results.cleanup = 'FAIL (Vectors still present in namespace)';
      }
    } catch (cleanupErr) {
      console.error("Cleanup Error:", cleanupErr);
    }
  }

  if (results.embedding === 'PASS' && results.upsert === 'PASS' && results.search === 'PASS' && results.recall === 'PASS' && results.cleanup === 'PASS') {
    results.overall = 'PASS';
  }

  console.log("FINAL_RESULTS_JSON=" + JSON.stringify(results));
}

runTest();
