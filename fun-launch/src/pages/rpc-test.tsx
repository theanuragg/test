import React, { useState, useEffect } from 'react';
import { Connection } from '@solana/web3.js';

const RPCTestPage: React.FC = () => {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const endpoints = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://solana.public-rpc.com',
    'https://solana.getblock.io/mainnet/',
    'https://solana.rpc.extrnode.com',
  ];

  const testEndpoint = async (endpoint: string) => {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      const startTime = Date.now();
      const slot = await connection.getSlot();
      const endTime = Date.now();
      
      return {
        endpoint,
        success: true,
        slot,
        responseTime: endTime - startTime,
        error: null,
      };
    } catch (error) {
      return {
        endpoint,
        success: false,
        slot: null,
        responseTime: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  };

  const runTests = async () => {
    setIsTesting(true);
    setTestResults([]);

    const results = [];
    for (const endpoint of endpoints) {
      const result = await testEndpoint(endpoint);
      results.push(result);
      setTestResults([...results]);
    }

    setIsTesting(false);
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Solana RPC Connection Test</h1>
        
        <div className="mb-6">
          <button
            onClick={runTests}
            disabled={isTesting}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded"
          >
            {isTesting ? 'Testing...' : 'Run Tests'}
          </button>
        </div>

        <div className="grid gap-4">
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`p-4 rounded border ${
                result.success
                  ? 'border-green-500 bg-green-900/20'
                  : 'border-red-500 bg-red-900/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{result.endpoint}</h3>
                  <p className="text-sm text-gray-300">
                    Status: {result.success ? '✅ Connected' : '❌ Failed'}
                  </p>
                  {result.success && (
                    <>
                      <p className="text-sm text-gray-300">
                        Slot: {result.slot?.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-300">
                        Response Time: {result.responseTime}ms
                      </p>
                    </>
                  )}
                  {!result.success && (
                    <p className="text-sm text-red-300">
                      Error: {result.error}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  {result.success ? (
                    <span className="text-green-400">✓</span>
                  ) : (
                    <span className="text-red-400">✗</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {testResults.length > 0 && (
          <div className="mt-8 p-4 bg-gray-800 rounded">
            <h2 className="text-xl font-semibold mb-4">Summary</h2>
            <p>
              Working endpoints: {testResults.filter(r => r.success).length} / {testResults.length}
            </p>
            <p className="text-sm text-gray-300 mt-2">
              Recommended: Use the fastest working endpoint for your application.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RPCTestPage;
