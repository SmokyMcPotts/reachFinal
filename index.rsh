'reach 0.1';

const commonInteract = {
  getHand: Fun([], UInt),
  getGuess: Fun([UInt], UInt),
  seeThrown: Fun([UInt], Null),
  seeWinner: Fun([UInt], Null),
};

export const main = Reach.App(() => {
  const A = Participant('Alice', { 
    ...commonInteract,
    // Specify Alice's interact interface here
  });
  const B = Participant('Bob', {
    ...commonInteract,
    // Specify Bob's interact interface here
  });
  init();
  
  // The first one to publish deploys the contract
  A.only(() => {
    const handAlice = declassify(interact.getHand());
    const guessAlice = declassify(interact.getGuess(handAlice));
  });
  A.publish( handAlice, guessAlice );
  commit();
  
  // The second one to publish always attaches
  B.only(() => {
    const handBob = declassify(interact.getHand());
    const guessBob = declassify(interact.getGuess(handBob));
  });
  B.publish( handBob, guessBob );
  commit();

  // write your program here
  const rightAnswer = (handAlice + handBob);
  const winner = () => {
    if ( guessAlice == guessBob ) {
      return 2;
    } else {
      if ( guessAlice == rightAnswer ) {
        return 0;
      } else if ( guessBob == rightAnswer ) {
        return 1;
      } else {
        return 2;
      };
    };
    each([A, B], () => {
      interact.seeWinner(winner());
    });
  };

  exit();
});
