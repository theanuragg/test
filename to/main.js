


import { Connection, PublicKey } from "@solana/web3.js";

(async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const poolPubkey = new PublicKey("3ocMxUwmMk9Kp8Sr8Kca6RLkwbzWoNn16JnhXEUTb4zt");
  const acct = await connection.getAccountInfo(poolPubkey);

  if (!acct) {
    console.error("Pool account not found");
    return;
  }

  const data = acct.data;
  // Assume offset: 1 (bump) + 32 + 32 + 32 = 97 bytes before initial_market_cap
  const offset = 97;
  const initial = Number(data.readBigUInt64LE(offset));
  const graduation = Number(data.readBigUInt64LE(offset + 8));

  console.log("Initial Market Cap:", initial);
  console.log("Graduation Market Cap:", graduation);
})();
