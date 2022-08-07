import { loadStdlib, ask } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib();

const suStr = stdlib.standardUnit;
const isNew = await ask.ask(
    `Type Y for new game.\nType N to join an existing game.`,
    ask.yesno
);
const who = isNew ? 'Alice' : 'Bob';

console.log(`Starting backends, I will call you ${who}...`); 

let acc = null;
const createAcc = await ask.ask(
  `Would you like to create an account? (only possible on devnet)`,
  ask.yesno
);
if (createAcc) {
  acc = await stdlib.newTestAccount(stdlib.parseCurrency(1000));
} else {
  const secret = await ask.ask(
    `What is your account secret?`,
    (x => x)
  );
  acc = await stdlib.newAccountFromSecret(secret);
};

const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBal = async () => fmt(await stdlib.balanceOf(acc));

console.log(`${createAcc ? 'Account created' : 'Account connected'}. Your current balance is ${await getBal()} ${suStr}.`);

console.log(`Deploying contract...`);

let ctc = null;
if (isNew) {
    const ctc = acc.contract(backend);
    /*ctc.getInfo().then((info) => {
        console.log(`The contract is deployed as = ${JSON.stringify(info)}`);
    });*/
    const info = await ctc.getInfo();
    console.log(`Contract is deployed. Contract info is ${JSON.stringify(info)}`);
} else {
    const info = await ask.ask(`Please paste the contract info:`, JSON.parse);
    const ctc = acc.contract(backend, info);
};
console.log(`You are attached to ${JSON.stringify(info)}`);

console.log(`Opponent found. Morra game initiated. Choose wisely!`);
const before = await getBal();
console.log(`Your current balance is ${before} ${suStr}.`);

const interact = {
    ...stdlib.hasRandom,
};

const part = isNew ? ctc.p.Alice : ctc.p.Bob;
const HAND = [0, 1, 2, 3, 4, 5];
const GUESS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const WINNER = [`${isNew ? 'You win' : 'Bob wins'}.`, `Draw`, `${isNew ? 'Alice wins' : 'You win'}.`];

if (isNew) {
    const bet = await ask.ask(`How much would you like to wager?`, (x) => stdlib.parseCurrency);
    interact.wager = bet;
    interact.daedline = { ETH: 50, ALGO: 100, CFX: 1000 }[stdlib.connector];
} else {
    interact.acceptWager = async (wager) => {
        const accept = await ask.ask(`Do you accept the wager of ${fmt(wager)} ${suStr}?`, ask.yesno);
        if (!accept) {
            process.exit(0);
        };
    };
};

interact.getHand = async () => {
    const hand = await ask.ask(`How many fingers will you throw?`, (x) => {
        const hand = HAND[x];
        if (!HAND.includes(hand)) {
            throw Error(`Not a valid choice, please pick a number between 0 and 5.`);
        }
        return hand;
    });
    console.log(`You threw ${HAND[hand]} fingers.`);
};

interact.getGuess = async () => {
    const guess = await ask.ask(`How many total fingers will you guess?`, (x) => {
        const guess = GUESS[x];
        if (!GUESS.includes(guess)) {
            throw Error(`Not a valid choice, please pick a number between 0 and 10.`);
        }
        return guess;
    });
    console.log(`You guessed ${GUESS(guess)} total fingers.`);
};

interact.seeWinner = async (winner) => {
    console.log(`The outcome is ${WINNER[winner]}`);
};

await part(interact);

const after = await getBal();
console.log(`Your balance went from ${before} ${suStr} to ${after} ${suStr}.`);

ask.done();