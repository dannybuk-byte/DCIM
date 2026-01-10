/**
 * IPFS Storage Integration
 * 
 * Real integration with IPFS for decentralized storage.
 * Uses public gateways and Pinata/web3.storage for pinning.
 * 
 * @see https://docs.ipfs.tech/
 */

import { circuitBreaker } from '../utils/circuitBreaker';

// Public IPFS gateways for reading
const IPFS_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
];

// IPFS pinning services (require API keys)
const PINNING_SERVICES = {
  pinata: {
    name: 'Pinata',
    apiUrl: 'https://api.pinata.cloud',
    signupUrl: 'https://app.pinata.cloud/register',
  },
  web3Storage: {
    name: 'web3.storage',
    apiUrl: 'https://api.web3.storage',
    signupUrl: 'https://web3.storage/',
  },
  nftStorage: {
    name: 'NFT.Storage',
    apiUrl: 'https://api.nft.storage',
    signupUrl: 'https://nft.storage/',
  },
};

export interface IPFSConfig {
  pinataApiKey?: string;
  pinataSecretKey?: string;
  web3StorageToken?: string;
}

export interface IPFSUploadResult {
  cid: string;
  size: number;
  gateway: string;
  pinned: boolean;
  timestamp: Date;
}

/**
 * Store data to IPFS using Pinata or web3.storage
 */
export async function storeToIPFS(
  data: Record<string, unknown>,
  config?: IPFSConfig
): Promise<IPFSUploadResult> {
  const jsonData = JSON.stringify(data);
  const blob = new Blob([jsonData], { type: 'application/json' });
  
  // Try Pinata if API key provided
  if (config?.pinataApiKey && config?.pinataSecretKey) {
    const formData = new FormData();
    formData.append('file', blob, 'data.json');
    formData.append('pinataMetadata', JSON.stringify({
      name: `dcim-export-${Date.now()}`,
    }));

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'pinata_api_key': config.pinataApiKey,
        'pinata_secret_api_key': config.pinataSecretKey,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      cid: result.IpfsHash,
      size: result.PinSize,
      gateway: `${IPFS_GATEWAYS[0]}${result.IpfsHash}`,
      pinned: true,
      timestamp: new Date(result.Timestamp),
    };
  }

  // Try web3.storage if token provided
  if (config?.web3StorageToken) {
    const response = await fetch('https://api.web3.storage/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.web3StorageToken}`,
        'X-Name': `dcim-export-${Date.now()}.json`,
      },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(`web3.storage upload failed: ${response.status}`);
    }

    const result = await response.json();
    
    return {
      cid: result.cid,
      size: blob.size,
      gateway: `https://w3s.link/ipfs/${result.cid}`,
      pinned: true,
      timestamp: new Date(),
    };
  }

  // No pinning service configured - generate a mock CID for demo
  // In production, users should configure Pinata or web3.storage
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonData);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Create a base58 encoded hash (simplified)
  const mockCid = `Qm${hashHex.slice(0, 44)}`;
  
  console.warn('No IPFS pinning service configured. Configure Pinata or web3.storage for real uploads.');
  console.info(`To configure: Visit ${PINNING_SERVICES.pinata.signupUrl} or ${PINNING_SERVICES.web3Storage.signupUrl}`);
  
  return {
    cid: mockCid,
    size: blob.size,
    gateway: `${IPFS_GATEWAYS[0]}${mockCid}`,
    pinned: false,
    timestamp: new Date(),
  };
}

/**
 * Retrieve data from IPFS via public gateways
 */
export async function retrieveFromIPFS(cid: string): Promise<unknown> {
  // Try public gateways in order
  for (const gateway of IPFS_GATEWAYS) {
    try {
      const response = await fetch(`${gateway}${cid}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000),
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch {
      continue;
    }
  }

  throw new Error(`Failed to retrieve CID ${cid} from any gateway`);
}

/**
 * Check IPFS connectivity status
 */
export async function checkIPFSStatus(): Promise<{
  heliaAvailable: boolean;
  gatewaysAvailable: string[];
  pinningConfigured: boolean;
}> {
  const gatewaysAvailable: string[] = [];

  // Check each gateway with a known CID (IPFS logo)
  const testCid = 'QmQPeNsJPyVWPFDVHb77w8G42Fvo15z4bG2X8D2GhfbSXc';
  
  const checks = await Promise.allSettled(
    IPFS_GATEWAYS.map(async (gateway) => {
      const response = await fetch(`${gateway}${testCid}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        return gateway;
      }
      throw new Error('Not available');
    })
  );

  for (const result of checks) {
    if (result.status === 'fulfilled') {
      gatewaysAvailable.push(result.value);
    }
  }

  return {
    heliaAvailable: false, // Helia requires npm package
    gatewaysAvailable,
    pinningConfigured: false, // Would need to check localStorage for API keys
  };
}

/**
 * Get IPFS connection instructions
 */
export function getIPFSSetupInstructions(): {
  pinata: string;
  web3Storage: string;
} {
  return {
    pinata: `
# Get free API keys at: ${PINNING_SERVICES.pinata.signupUrl}
# Free tier: 1GB storage, 100 pins

# Add to Settings > IPFS Configuration:
PINATA_API_KEY=your_api_key
PINATA_SECRET_KEY=your_secret_key
    `.trim(),
    web3Storage: `
# Get free token at: ${PINNING_SERVICES.web3Storage.signupUrl}
# Free tier: 5GB storage

# Add to Settings > IPFS Configuration:
WEB3_STORAGE_TOKEN=your_token
    `.trim(),
  };
}

// Circuit breaker wrapped exports
export const ipfsStorage = {
  storeToIPFS: circuitBreaker(storeToIPFS, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  retrieveFromIPFS: circuitBreaker(retrieveFromIPFS, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  checkIPFSStatus,
  getIPFSSetupInstructions,
};

export default ipfsStorage;
