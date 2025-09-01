import { NextApiRequest, NextApiResponse } from 'next';
import { getEnterpriseConnection, getEnterpriseConnectionStatus, testEnterpriseEndpoints } from '@/lib/config/enterprise-rpc';
import { getProductionConnection, getProductionConnectionStatus, testProductionEndpoints } from '@/lib/config/production-rpc';
import { getFallbackConnection, testFallbackEndpoints } from '@/lib/config/fallback-rpc';
import { getSimpleConnection, testConnectionWithRetry } from '@/lib/config/simple-rpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing ALL RPC solutions...');

    const results = {
      enterprise: null as any,
      production: null as any,
      fallback: null as any,
      simple: null as any,
      comparison: null as any,
      recommendations: [] as string[]
    };

    // Test 1: Enterprise RPC (Most Advanced)
    try {
      console.log('🔄 Testing Enterprise RPC...');
      const enterpriseConnection = await getEnterpriseConnection();
      const enterpriseSlot = await enterpriseConnection.getSlot();
      
      results.enterprise = {
        success: true,
        endpoint: enterpriseConnection.rpcEndpoint,
        slot: enterpriseSlot,
        status: getEnterpriseConnectionStatus(),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Enterprise RPC: Success');
    } catch (error) {
      results.enterprise = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      console.error('❌ Enterprise RPC: Failed', error);
    }

    // Test 2: Production RPC
    try {
      console.log('🔄 Testing Production RPC...');
      const productionConnection = await getProductionConnection();
      const productionSlot = await productionConnection.getSlot();
      
      results.production = {
        success: true,
        endpoint: productionConnection.rpcEndpoint,
        slot: productionSlot,
        status: getProductionConnectionStatus(),
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Production RPC: Success');
    } catch (error) {
      results.production = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      console.error('❌ Production RPC: Failed', error);
    }

    // Test 3: Fallback RPC
    try {
      console.log('🔄 Testing Fallback RPC...');
      const fallbackConnection = await getFallbackConnection();
      const fallbackSlot = await fallbackConnection.getSlot();
      
      results.fallback = {
        success: true,
        endpoint: fallbackConnection.rpcEndpoint,
        slot: fallbackSlot,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Fallback RPC: Success');
    } catch (error) {
      results.fallback = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      console.error('❌ Fallback RPC: Failed', error);
    }

    // Test 4: Simple RPC
    try {
      console.log('🔄 Testing Simple RPC...');
      const simpleConnection = await getSimpleConnection();
      const simpleSlot = await simpleConnection.getSlot();
      
      results.simple = {
        success: true,
        endpoint: simpleConnection.rpcEndpoint,
        slot: simpleSlot,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ Simple RPC: Success');
    } catch (error) {
      results.simple = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      console.error('❌ Simple RPC: Failed', error);
    }

    // Test 5: Endpoint Health Tests
    try {
      console.log('🔄 Testing endpoint health...');
      
      const [enterpriseEndpoints, productionEndpoints, fallbackEndpoints] = await Promise.allSettled([
        testEnterpriseEndpoints(),
        testProductionEndpoints(),
        testFallbackEndpoints()
      ]);

      results.comparison = {
        enterpriseEndpoints: enterpriseEndpoints.status === 'fulfilled' ? enterpriseEndpoints.value : null,
        productionEndpoints: productionEndpoints.status === 'fulfilled' ? productionEndpoints.value : null,
        fallbackEndpoints: fallbackEndpoints.status === 'fulfilled' ? fallbackEndpoints.value : null
      };
      
      console.log('✅ Endpoint health tests completed');
    } catch (error) {
      console.error('❌ Endpoint health tests failed', error);
    }

    // Generate recommendations
    const successfulTests = [
      { name: 'Enterprise', result: results.enterprise },
      { name: 'Production', result: results.production },
      { name: 'Fallback', result: results.fallback },
      { name: 'Simple', result: results.simple }
    ].filter(test => test.result?.success);

    if (successfulTests.length === 0) {
      results.recommendations.push('🚨 CRITICAL: All RPC solutions failed. Check network connectivity and endpoint availability.');
      results.recommendations.push('💡 Consider using a paid RPC service like Helius, QuickNode, or Alchemy for better reliability.');
    } else {
      const bestSolution = successfulTests[0];
      results.recommendations.push(`✅ RECOMMENDED: Use ${bestSolution.name} RPC solution (${bestSolution.result.endpoint})`);
      
      if (bestSolution.name === 'Enterprise') {
        results.recommendations.push('🎯 Enterprise RPC provides the best reliability with load balancing and circuit breakers.');
      } else if (bestSolution.name === 'Production') {
        results.recommendations.push('🏭 Production RPC provides good reliability with health monitoring and retry logic.');
      } else if (bestSolution.name === 'Fallback') {
        results.recommendations.push('🔄 Fallback RPC provides basic reliability with multiple endpoint fallbacks.');
      } else {
        results.recommendations.push('📝 Simple RPC provides basic functionality but may have reliability issues.');
      }
    }

    // Add performance recommendations
    if (results.enterprise?.success) {
      results.recommendations.push('⚡ Enterprise RPC includes load balancing for optimal performance.');
    }
    
    if (results.production?.success) {
      results.recommendations.push('🛡️ Production RPC includes circuit breakers to prevent cascading failures.');
    }

    // Add monitoring recommendations
    results.recommendations.push('📊 Monitor RPC performance and switch to better endpoints if needed.');
    results.recommendations.push('🔧 Consider implementing custom RPC endpoints for production use.');

    console.log('✅ All RPC tests completed successfully');

    return res.status(200).json({
      success: true,
      message: 'RPC solutions tested successfully',
      results,
      summary: {
        totalTests: 4,
        successfulTests: successfulTests.length,
        failedTests: 4 - successfulTests.length,
        bestSolution: successfulTests[0]?.name || 'None',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ RPC test failed:', error);
    
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during RPC testing',
      timestamp: new Date().toISOString()
    });
  }
}
