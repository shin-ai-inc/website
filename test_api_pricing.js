// Test API with pricing question in Japanese
const https = require('https');

const data = JSON.stringify({
    message: "料金はいくらですか？",
    sessionId: "test-" + Date.now()
});

const options = {
    hostname: 'api-n222a95l5-massaa39s-projects.vercel.app',
    path: '/api/chatbot',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(data)
    }
};

console.log('Testing API with pricing question...');
console.log('Request:', data);

const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
        responseData += chunk;
    });

    res.on('end', () => {
        console.log('\nResponse Status:', res.statusCode);
        console.log('Response Data:', responseData);

        try {
            const parsed = JSON.parse(responseData);
            console.log('\n✅ Response:', parsed.response);

            if (parsed.response.includes('お問い合わせフォーム')) {
                console.log('\n✅ SUCCESS: Contact link is included in pricing response');
            } else {
                console.log('\n❌ FAIL: Contact link is NOT included in pricing response');
            }
        } catch (e) {
            console.error('Failed to parse response:', e.message);
        }
    });
});

req.on('error', (e) => {
    console.error('Request error:', e.message);
});

req.write(data);
req.end();
