import {loadStdlib} from '@reach-sh/stdlib';
import * as backend from './build/index.main.mjs';
const stdlib = loadStdlib(process.env);

console.log('Hello');

const startingBalance = stdlib.parseCurrency(100);
const [ accAlice, accBob ] =
  await stdlib.newTestAccounts(2, startingBalance);
console.log('Launching accounts...');

const ctcAlice = accAlice.contract(backend);
const ctcBob = accBob.contract(backend, ctcAlice.getInfo());

console.log('Starting backends...');
console.log(`${ctcAlice.getInfo()}`);

const HAND = [0, 1, 2, 3, 4, 5];
const GUESS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
//const THROWN = [];
//const rightAnswer = THROWN[0] + THROWN[1];
const OUTCOME = ['Alice won', 'no one won', 'Bob won'];

const commonInteract = async (who) => ({
  getHand: async () => {
    const hand = Math.floor(Math.random() * 6);
    console.log(`${who} threw ${HAND[hand]} fingers`);
    THROWN.push(HAND[hand])
    return hand;
  },
  getGuess: async (hand) => {
    const guess = Math.floor(Math.random * (10 - HAND[hand])) + HAND[hand];
    console.log(`${who} guessed ${GUESS[guess]}`)
    return guess;
  },
  seeThrown: async (rightAnswer) => { 
    console.log(`Total fingers thrown was ${rightAnswer}.`);
  },
  seeWinner: async (winner) => {
    console.log(`${who} saw that ${OUTCOME[winner]}.`);
  },
});

await Promise.all([
  backend.Alice(ctcAlice, {
    ...commonInteract('Alice'),
    // implement Alice's interact object here
  }),
  backend.Bob(ctcBob, {
    ...commonInteract('Bob'),
    // implement Bob's interact object here
  }),
]);

console.log('Goodbye, Alice and Bob!');
