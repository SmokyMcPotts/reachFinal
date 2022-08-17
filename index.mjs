import { loadStdlib, ask } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);

//assign user, assign username to variable 'who'
const uName = await ask.ask(
    `Are you Alice?`,
    ask.yesno
);
const who = uName ? 'Alice' : 'Bob';

console.log(`Starting backends, one moment ${who}...`); 

//create two accounts, assign variable 'acc' depending on username
const accAlice = await stdlib.newTestAccount(stdlib.parseCurrency(100));
const accBob = await stdlib.newTestAccount(stdlib.parseCurrency(100));
let acc = (uName ? accAlice : accBob);

console.log(`Account created.`);

//misc accounting functions
const units = stdlib.standardUnit;
const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBal = async (acc) => fmt(await stdlib.balanceOf(acc));

console.log(`Your current balance is ${await getBal(acc)} ${units}.`);

//create contracts, assign variable 'ctc' depending on username
const ctcAlice = accAlice.contract(backend);
const ctcBob = accBob.contract(backend, ctcAlice.getInfo());
let ctc = (uName ? ctcAlice : ctcBob);

console.log(`Deploying contract...`);

//display before balance
const before = await getBal(acc);
console.log(`Your current balance is ${before} ${units}.`);

//create interact
const interact = {
    ...stdlib.hasRandom,
};

//participant interact depends on who
const part = (uName ? ctc.p.Alice : ctc.p.Bob);
//'hand' will be any integer 0-5, and should display as same
const HAND = [0, 1, 2, 3, 4, 5];
//'guess' will be any integer 0-10, and should display as same
//in future, throw error if guess > hand + 5
const GUESS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
//'WINNER' array will display different strings, depending on who
const WINNER = [`${uName ? 'You win' : 'Bob wins'}.`, `Draw`, `${uName ? 'Alice wins' : 'You win'}.`];

//'wager' or 'acceptWager' depending on who
if (uName) {
    const bet = await ask.ask(`How much would you like to wager?`, (x) => stdlib.parseCurrency);
    //should send in atomic units
    interact.wager = bet;
    //no option to set timeout yet
    interact.deadline = { ETH: 100, ALGO: 1000, CFX: 10000 }[stdlib.connector];
} else {
    interact.acceptWager = async (wager) => {
        //receives 'wager' in atomic units and formats for console log
        const accept = await ask.ask(`Do you accept the wager of ${fmt(wager)} ${units}?`, ask.yesno);
        //exit if wager not accepted (see what happens to Alice)
        if (!accept) {
            process.exit(0);
        };
    };
};

//'getHand' and 'getGuess' are the same for both participants
interact.getHand = async () => {
    const hand = await ask.ask(`How many fingers will you throw?`, (x) => {
        const hand = HAND[x];
        //throw error if 'hand' is not valid, require valid answer to proceed
        if (!HAND.includes(hand)) {
            throw Error(`Not a valid choice, please pick a number between 0 and 5.`);
        }
        return hand;
    });
    console.log(`You will throw ${HAND[hand]} fingers.`);
};

interact.getGuess = async () => {
    const guess = await ask.ask(`How many total fingers will you guess?`, (x) => {
        const guess = GUESS[x];
        //throw error if 'guess' is not valid, require valid answer to proceed
        if (!GUESS.includes(guess)) {
            throw Error(`Not a valid choice, please pick a number between 0 and 10.`);
        }
        return guess;
    });
    console.log(`You will guess ${GUESS(guess)} total fingers.`);
};

//both participants will see the who wins
//'winner' value should come back as a 0, 1, or 2
//'WINNER' array will display different strings, depending on who
interact.seeWinner = async (winner) => {
    console.log(`The outcome is ${WINNER[winner]}`);
};

//await participant interacts
await part(interact);

//create 'after' then display 'before' and 'after' balances
const after = await getBal();
console.log(`Your balance went from ${before} ${units} to ${after} ${units}.`);

ask.done();