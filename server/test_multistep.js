require('dotenv').config();
const AIService = require('./services/AIService');
const User = require('./models/User');
const mongoose = require('mongoose');

async function runTest() {
    await mongoose.connect(process.env.MONGO_URI);
    
    // Find any user to bind to
    const user = await User.findOne({});
    if (!user) {
        console.error("No user found in DB to test with.");
        process.exit(1);
    }

    const mockSocket = {
        id: 'mock_socket_123',
        isInterrupted: false,
        emit: (event, data) => {
            if (event === 'ai:tts:response:chunk') {
                if (data.chunk) process.stdout.write(data.chunk);
            } else {
                console.log(`[Socket Emit] ${event}:`, data);
            }
        }
    };

    console.log(`\n\nStarting Multistep Test for User ${user._id}...\n`);

    try {
        await AIService.processQuery(
            user._id,
            "Check what time it is, and then explicitly use the getTopNews tool to tell me the news.",
            mockSocket,
            null,
            null
        );
        console.log('\n\nTest Completed Successfully.');
    } catch (e) {
        console.error('\nTest Failed:', e);
    }

    await mongoose.disconnect();
}

runTest();
