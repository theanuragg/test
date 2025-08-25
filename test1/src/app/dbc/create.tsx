// pages/dbc/create.tsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import DbcConfigForm from './Dbc-config';
import DbcPoolForm from './Db-poolForm';

export default function DbcPoolCreation() {
  const { publicKey } = useWallet();
  const [step, setStep] = useState(1);
  const [configData, setConfigData] = useState<any>(null);

  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Create DBC Pool</h1>
          <p>Please connect your wallet to create a DBC pool.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Create DBC Pool</h1>

      {/* Progress Steps */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 1 ? 'bg-blue-500 text-white' : 'bg-gray-300'
          }`}>
            1
          </div>
          <div className={`w-16 h-1 ${
            step >= 2 ? 'bg-blue-500' : 'bg-gray-300'
          }`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            step >= 2 ? 'bg-blue-500 text-white' : 'bg-gray-300'
          }`}>
            2
          </div>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold">
          {step === 1 ? 'Step 1: Configure DBC Parameters' : 'Step 2: Create Pool'}
        </h2>
        <p className="text-gray-600">
          {step === 1
            ? 'Configure the bonding curve parameters and pool settings'
            : 'Create the DBC pool with your configuration'
          }
        </p>
      </div>

      {/* Step Content */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        {step === 1 && (
          <DbcConfigForm
            onConfigComplete={(config: unknown) => {
              setConfigData(config);
              setStep(2);
            }}
          />
        )}

        {step === 2 && configData && (
          <DbcPoolForm
            config={configData}
            onPoolCreated={() => {
              // Handle pool creation success
              console.log('Pool created successfully');
            }}
          />
        )}
      </div>
    </div>
  );
}
