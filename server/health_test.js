require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

async function checkPinecone() {
  const results = {
    backendStarted: 'PASS',
    apiKeyLoaded: process.env.PINECONE_API_KEY ? 'PASS' : 'FAIL',
    indexResolved: process.env.PINECONE_INDEX || 'arc-brain',
    authSuccess: 'FAIL',
    indexReachable: 'FAIL',
    dimension: null,
    metric: null,
    error: null
  };

  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const indexList = await pc.listIndexes();
    results.authSuccess = 'PASS';
    
    const indexMeta = indexList.indexes.find(i => i.name === results.indexResolved);
    if (indexMeta) {
        results.indexReachable = 'PASS';
        results.dimension = indexMeta.dimension;
        results.metric = indexMeta.metric;
    } else {
        results.indexReachable = 'FAIL (Not found)';
    }
  } catch (err) {
    results.error = err.message;
  }

  console.log(JSON.stringify(results, null, 2));
}

checkPinecone();
