import { loadStdlib, ask } from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);

console.log('Starting Morra...');

const isNew = await ask.ask(
  `Is this a new game? \n(If you have contract information, press n)`,
  ask.yesno
);

const who = isNew ? 'Alice' : 'Bob';
const createBal = stdlib.parseCurrency(1000);

console.log(`Your avatar will be ${who}`);

const createAcc = await ask.ask(
  `Would you like to create an account?`,
  ask.yesno
);

let acc = null;
if(createAcc){
  acc = await stdlib.newTestAccount(createBal);
  console.log(`Creating new account for ${who}...`);
} else { 
  const secret = await ask.ask(
    `What is your account secret?`,
    (x => x)
  );
  acc = await stdlib.newAccountFromSecret(secret);
  console.log(`Retrieving account info for ${who}.`)
}

const fmt = (x) => stdlib.formatCurrency(x, 4);
const getBal = async () => fmt(await stdlib.balanceOf(acc));

console.log(`Loading account info...`)

const before = await getBal();
console.log(`Your balance is ${before}`);

let ctc = null;
if (isNew){
  ctc = acc.contract(backend);
  ctc.getInfo().then((info) => {
    console.log(`The contract is deployed = ${JSON.stringify(info)}`);
  });
} else {
  const info = await ask.ask(
    `Please paste the contract information`,
    JSON.parse
  );
  ctc = acc.contract(backend, info);
}

const interact = { ...stdlib.hasRandom };

interact.informTimeout = () => {
  console.log(`There was a timeout`);
  process.exit(1);
};

if(isNew) {
  const amount = await ask.ask(
    `How much would you like to wager?`,
    stdlib.parseCurrency
  );
  interact.wager = amount;
  interact.deadline = {ETH: 100, ALGO: 100, CFX: 1000}[stdlib.connector];

} else { 
  interact.acceptWager = async (amount) => {
    const accepted = await ask.ask(
      `Do you accept the wager of ${fmt(amount)}`,
      ask.yesno
    );
    if(!accepted){
      process.exit(0);
    }
  };
}

const HAND = [0, 1, 2, 3, 4, 5];
const GUESS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

interact.getHand = async () => {
  //do something to limit the possible answers
  const hand = await ask.ask(`How many fingers will you throw? \nType a number between 0 and 5.`, (x) => {
    const hand = HAND[x];
    if ( hand === undefined ) {
      throw Error(`Not a valid hand ${hand}`);
    }
    return hand;
  });
  console.log(`You threw ${HAND[hand]} fingers.`);
  return hand;
};

interact.getGuess = async () => {
  //limit possible answers here too
  const guess = await ask.ask(`How many total fingers will be thrown?\nType a number between 0 and 10.`, (x) => {
    const guess = GUESS[x];
    if ( guess === undefined ) {
      throw Error(`Not a valid guess ${guess}`);
    }
    return guess;
  });
  console.log(`You guessed ${GUESS[guess]} fingers total.`);
  return guess;
};

interact.seeAnswer = (rightAnswer)  => {
  console.log(`The correct total was ${rightAnswer}.`);
};

const OUTCOME = [`${isNew ? 'you win' : 'Alice wins'}!`, `${isNew ? 'Bob wins' : 'you win'}!`, `Draw, that shouldn't have happened...`];
interact.seeOutcome = (outcome) => {
  console.log(`The outcome is ${OUTCOME[outcome]}`);
};

const part = isNew ? ctc.p.Alice : ctc.p.Bob;
await part(interact);

const after = await getBal();
console.log(`Your balance is now ${after}`);

//this didn't work and I don't have time to figure out why

/*if ( after < before ) {
  console.log(`Better luck next time.`);
} else {
  console.log(`Well played!`);
};*/

console.log(`Goodbye, ${who}!`);

ask.done();