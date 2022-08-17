'reach 0.1';

const commonInteract = {
  ...hasRandom, 
  getHand: Fun([], UInt),
  getGuess: Fun([], UInt),
  seeThrown: Fun([UInt], Null),
  informTimeout: Fun([], Null),
  seeWinner: Fun([UInt], Null),
};

export const main = Reach.App(() => {
  const A = Participant('Alice', { 
    ...commonInteract,
    wager: UInt, //should come over in atomic units
    deadline: UInt, //hardcoded, number depends on connector only
    // Additional Alice interact interface here
  });
  const B = Participant('Bob', {
    ...commonInteract,
    acceptWager: Fun([UInt], Null),
    // Additional Bob interact interface here
  });
  init();

  // will not ever be triggered in devnet, unnless I do it artificially
  const informTimeout = () => {
    each([A, B], () => {
      interact.informTimeout();
    });
  };
  
  // The first one to publish (Alice) deploys the contract
  A.only(() => {
    const wager = declassify(interact.wager);
    const deadline = declassify(interact.deadline);
  });
  //publish wager and deadline; pay wager to contract
  A.publish(wager, deadline)
    .pay(wager);//error is occurring here
  commit();

  B.only(() => {
    interact.acceptWager(wager);
  });
  B.pay(wager)
    .timeout(relativeTime(deadline), () => closeTo(A, informTimeout));
  
  //while loop disabled until I can get it to work one time; 
  //reinstall once program makes one complete pass

  //var winner = 1;
  //invariant( balance() == 2 * wager );
  //while ( winner == 1 ) {
  commit(); //tab over below for while loop

  A.only(() => {
    const handAlice = declassify(interact.getHand());
    const guessAlice = declassify(interact.getGuess());
  });
  A.publish(handAlice, guessAlice)
    .timeout(relativeTime(deadline), () => closeTo(B, informTimeout));
  commit();
  
  // The second one to publish always attaches
  B.only(() => {
    const handBob = declassify(interact.getHand());
    const guessBob = declassify(interact.getGuess());
  });
  B.publish( handBob, guessBob );
  //commit();

  const rightAnswer = (handAlice + handBob);
  const winner = () => {
    if ( guessAlice == guessBob ) {
      return 1;
    } else {
      if ( guessAlice == rightAnswer ) {
        return 0;
      } else if ( guessBob == rightAnswer ) {
        return 2;
      } else {
        return 1;
      };
    }; //tab over above for while loop
  };  // write your program here

  const outcome = winner();
  each([A, B], () => {
    interact.seeThrown(rightAnswer);
    interact.seeWinner(winner());
  });
  if (outcome == 0) {
    transfer(2 * wager).to(A);
    commit();
  } else if (outcome == 2) {
    transfer(2 * wager).to(B);
    commit();
  } else {
    transfer(wager).to(A);
    transfer(wager).to(B);
    commit();
  }


  exit();
  //}
})