import { DashboardFeature } from '@/components/dashboard/dashboard-feature'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="container mx-auto py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Welcome to Token Creator</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
          Create and manage your SPL tokens on Solana
        </p>
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg max-w-2xl mx-auto mb-6">
          <h2 className="text-lg font-semibold mb-2">How it works:</h2>
          <ol className="text-left space-y-2 text-gray-700 dark:text-gray-300">
            <li>1. <strong>Connect your wallet</strong> using the button in the header</li>
            <li>2. <strong>Go to the Token page</strong> to create your token</li>
            <li>3. <strong>Sign the transaction</strong> with your connected wallet</li>
            <li>4. <strong>View transaction signature</strong> in your wallet</li>
          </ol>
        </div>
        
        <div className="mt-6">
          <Link href="/token">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Create Your Token
            </Button>
          </Link>
        </div>
      </div>
      
      <DashboardFeature />
    </div>
  )
}
