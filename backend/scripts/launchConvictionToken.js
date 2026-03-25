/**
 * launchConvictionToken.js
 * Script to completely launch the "Conviction" app token using the Bags Token Launch API.
 * Phase 5 Hackathon requirement.
 */

import { launchToken } from '../services/bagsService.js';

const SEPARATOR = '\n' + '═'.repeat(60) + '\n';

async function runLaunch() {
  console.log(SEPARATOR);
  console.log('🚀 CONVICTION — Phase 5: Bags Token Launch');
  console.log(SEPARATOR);

  const tokenConfig = {
    name: "Conviction AI",
    symbol: "CONVICT",
    description: "The official token for the Conviction multi-agent token discovery app built for the Bags.fm Hackathon.",
    image: "https://files.catbox.moe/example_image.png", // Example permalink
    twitter: "https://twitter.com/ConvictionAI",
    website: "https://conviction.app",
    telegram: "https://t.me/ConvictionApp"
  };

  try {
    console.log(`[LaunchScript] Submitting token configuration for $${tokenConfig.symbol}...`);
    const response = await launchToken(tokenConfig);
    
    console.log('\n[LaunchScript] ✅ Response received from Bags API:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log(SEPARATOR);
    console.log('Launch sequence completed successfully.');
    console.log('Follow the generated URL or sign the returned payload to finalize the Token Launch onchain.');
  } catch (e) {
    console.error('\n[LaunchScript] ❌ Launch Failed:', e.message);
    console.log('\nCheck if the BAGS_API_KEY has the correct permissions, or if the API endpoint formatting matches /token-launch exactly.');
  }
}

runLaunch();
