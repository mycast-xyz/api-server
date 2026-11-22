const address = process.argv[2] || 'http://127.0.0.1:9010/video/policy';
let error;
for (let attempt = 0; attempt < 20; attempt++) {
    try {
        const response = await fetch(address, { signal: AbortSignal.timeout(3000) });
        const policy = await response.json();
        if (!response.ok || !(policy.maxBytes > 0 && policy.maxSeconds > 0 && policy.maxConcurrent > 0))
            throw new Error('Video policy is unavailable.');
        console.log('Video API health check passed.');
        process.exit(0);
    } catch (problem) { error = problem; }
    await new Promise(resolve => setTimeout(resolve, 1000));
}
throw new Error('Video API health check failed; do not deploy clients.', { cause: error });
