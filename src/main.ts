import { App } from '@slack/bolt';
import dotenv from 'dotenv';

import { AccountData, DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import { GasPrice, SigningStargateClient } from "@cosmjs/stargate";
import { msg, registry } from "kujira.js";

dotenv.config();

let wallet: DirectSecp256k1HdWallet;
let account: AccountData;
let client: SigningStargateClient;
const rpc: string = process.env.RPC as string;

const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
    appToken: process.env.SLACK_APP_TOKEN
});

app.message('vote', async ({ message, say }) => {
    console.log(message);

    let args = (message as any).text.split(" ");
    let proposalID, voteOption;
    try {
        proposalID = parseInt(args[1]);
        voteOption = args[2];
        const validOptions = {
            yes: 1,
            abstain: 2,
            no: 3,
            veto: 4
        }
        if (!validOptions.hasOwnProperty(voteOption.toLowerCase())) {
            throw new Error("Invalid vote option");
        }
        voteOption = validOptions[voteOption.toLowerCase()];
    } catch (e) {
        await say("Usage: vote <proposalID> <yes/no/abstain/veto>");
        return;
    }
    
    const vote_msg = msg.gov.msgVote({
        proposalId: proposalID.toString(),
        voter: process.env.GRANTER_ADDRESS as string,
        option: voteOption,
    });
    try {
        const result = await client.signAndBroadcast(account.address, [vote_msg], "auto");
        await say(`Voted for ${proposalID}: ${result.transactionHash}`);
    } catch(e: any) {
        await say(`Error: \`\`\`${e.message}\`\`\``);
    }
});

(async () => {
    wallet = await DirectSecp256k1HdWallet.fromMnemonic(process.env.MNEMONIC as string, {
        prefix: "kujira",
    });
    account = (await wallet.getAccounts())[0];
    client = await SigningStargateClient.connectWithSigner(rpc, wallet, {
        registry,
        gasPrice: GasPrice.fromString("0.00125ukuji"),
    });

    console.log(account.address, process.env.MNEMONIC);
    // Start your app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();

