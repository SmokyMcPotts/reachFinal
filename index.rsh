'reach 0.1';

//enum stuff
const [hand, ZERO, ONE, TWO, THREE, FOUR, FIVE] = makeEnum(6);
const [guess, guess0, guess1, guess2, guess3, guess4,
  guess5, guess6, guess7, guess8, guess9, guess10] = makeEnum(11);
const [gameOutcome, A_WINS, B_WINS, DRAW] = makeEnum(3);

//single funnction that uses both hands and both guesses
const winner = (handA, handB, guessA, guessB) => {
  //if they guess the same, nobody wins
  if (guessA == guessB) {
    const final = DRAW;
    return final;
  } else { //but if they don't guess the same, then...
    //if Alice guesses right, Alice Wins
    if (guessA == (handA + handB)) {
      const final = A_WINS;
      return final;
    } else {
      //if Bob guesses right, Bob wins
      if (guessB == (handA + handB)) {
        const final = B_WINS;
        return final;
      } else {//and if nobody guesses right, nobody wins
        const final = DRAW;
        return final;
      }
    }
  }
};

//assertions here
//give examples of each possible win, and each possible draw
assert(winner(ZERO, FOUR, guess0, guess4) == B_WINS);
assert(winner(FOUR, ZERO, guess4, guess0) == A_WINS);
assert(winner(ZERO, ONE, guess0, guess4) == DRAW);
assert(winner(FIVE, FIVE, guess10, guess10) == DRAW);
assert(winner(ZERO, ZERO, guess1, guess1) == DRAW);

//then cascading forall(s for all the rest of the possible combos
forall(UInt, handA =>
  forall(UInt, handB =>
    forall(UInt, guessA =>
      forall(UInt, guessB =>
        assert(gameOutcome(winner(handA, handB, guessA, guessB)))))));

//assert draws
forall(UInt, handA =>
  forall(UInt, handB =>
    forall(UInt, copycat => 
      assert(winner(handA, handB, copycat, copycat) == DRAW))));

//commonInteract stuff was good I think...
const sharedInteract = {
  ...hasRandom, 
  getHand: Fun([], UInt),
  getGuess: Fun([], UInt),
  seeAnswer: Fun([UInt], Null),
  seeOutcome: Fun([UInt], Null),
  informTimeout: Fun([], Null),
};

//Reach app starts here
export const main = Reach.App(() => {
  const Alice = Participant('Alice', {
    ...sharedInteract, 
    wager: UInt, //Alice sets wager
    deadline: UInt, //and deadline (hard-coded)
  });

  const Bob = Participant('Bob', {
    ...sharedInteract, 
    acceptWager: Fun([UInt], Null), //Bob accepts or declines
  });

  init();

  //not sure this ever works because I don't move the clock
  const informTimeout = () => {
    each([Alice, Bob], () => {
      interact.informTimeout();
    });
  };

  //Alice sets the wager
  Alice.only(() => {
    const wager = declassify(interact.wager);
    const deadline = declassify(interact.deadline);
  });

  //then publish and pay into new contract
  //technically bob could cost her a lot of $ by declining
  Alice.publish(wager, deadline)
    .pay(wager);
  commit();

  //mjs will kick out if bob declines
  Bob.only(() => {
    interact.acceptWager(wager);
  });

  //otherwise bob pays in
  Bob.pay(wager)
    .timeout(relativeTime(deadline), () => closeTo(Alice, informTimeout));
  //hold publish till game logic is done
  var outcome = DRAW;
  invariant(balance() == 2 * wager && gameOutcome(outcome));
  while ( outcome == DRAW ) {
    commit();

    Alice.only(() => {
      const _handA = interact.getHand();
      //can I do something to restrict the guesses to hand <= guess <= (hand +5)
      const _guessA = interact.getGuess();

      // makeCommitment with salt values
      const [_commitA, _saltA] = makeCommitment(interact, _handA);
      const commitA = declassify(_commitA);
      const [_guessCommitA, _guessSaltA] = makeCommitment(interact, _guessA);
      const guessCommitA = declassify(_guessCommitA);
    });

    // publish commitment to hand and commitment to guess value
    Alice.publish(commitA, guessCommitA)
      .timeout(relativeTime(deadline), () => closeTo(Bob, informTimeout));
    commit();

    // Bob cannot know these values at this state
    unknowable(Bob, Alice(_handA, _saltA));
    unknowable(Bob, Alice(_guessA, _guessSaltA));

    Bob.only(() => {
      const _handB = interact.getHand();
      const _guessB = interact.getGuess();
      const handB = declassify(_handB);
      const guessB = declassify(_guessB);
    });

    Bob.publish(handB, guessB)
      .timeout(relativeTime(deadline), () => closeTo(Alice, informTimeout));
    commit();

    Alice.only(() => {
      const [saltA, handA] = declassify([_saltA, _handA]);
      const [guessSaltA, guessA] = declassify([_guessSaltA, _guessA]);
    });

    Alice.publish(saltA, handA)
      .timeout(relativeTime(deadline), () => closeTo(Bob, informTimeout));
    checkCommitment(commitA, saltA, handA);
    commit();

    Alice.publish(guessSaltA, guessA)
      .timeout(relativeTime(deadline), () => closeTo(Bob, informTimeout));
    commit();

    Alice.only(() => {
      const rightAnswer = handA + handB;
      interact.seeAnswer(rightAnswer);
    });

    Alice.publish(rightAnswer)
      .timeout(relativeTime(deadline), () => closeTo(Bob, informTimeout));

    Bob.only(() => {
      interact.seeAnswer(rightAnswer);
    });
    // all Reach loops require this continue explicitly
    // variables are only permitted to be assigned values
    // immediately preceeding a continue
    outcome = winner(handA, handB, guessA, guessB);
    continue;
  }; // end of while loop

  // make sure that someone has won
  assert(outcome == A_WINS || outcome == B_WINS);

  // this should mean bob only gets paid if he wins
  //test that he's not getting paid on draws
  transfer(2 * wager).to(outcome == A_WINS ? Alice : Bob);
  commit();

  // show each sharedInteract the outcome
  each([Alice, Bob], () => {
    interact.seeOutcome(outcome);
  });
  exit();
});