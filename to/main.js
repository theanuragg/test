import * as anchor from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import fs from "fs";

const PROGRAM_ID = new PublicKey("dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN"); // DBC Program
const POOL_ID = new PublicKey("2U9r7QH8RXV6PFbk7xTigkeyiaLE6Wca9WbxAdyiPPoo");

// Load the Meteora DBC IDL (you need to have the JSON file in your project root)
const idl = JSON.parse(fs.readFileSync("./dbc.json", "utf8"));

(async () => {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const provider = new anchor.AnchorProvider(connection, {}, {});
  const program = new anchor.Program(idl, PROGRAM_ID, provider);

  const pool = await program.account.virtualPool.fetch(POOL_ID);

  console.log("Pool Data:");
  console.log("Initial Market Cap:", pool.initialMarketCap.toString());
  console.log("Graduation Market Cap:", pool.graduationMarketCap.toString());
})();
