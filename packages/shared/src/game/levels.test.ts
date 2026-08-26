import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { levelForXp, xpToReachLevel } from './levels';

describe('xpToReachLevel', () => {
  it('starts at 0 for levels < 2', () => {
    assert.equal(xpToReachLevel(1), 0);
    assert.equal(xpToReachLevel(0), 0);
    assert.equal(xpToReachLevel(-5), 0);
  });
  it('follows T(n) = 50·n·(n+1)', () => {
    assert.equal(xpToReachLevel(2), 300);
    assert.equal(xpToReachLevel(3), 600);
    assert.equal(xpToReachLevel(4), 1000);
    assert.equal(xpToReachLevel(5), 1500);
  });
});

describe('levelForXp', () => {
  it('L1 boundaries', () => {
    assert.deepEqual(levelForXp(0), { level: 1, intoLevel: 0, forNextLevel: 300 });
    assert.equal(levelForXp(299).level, 1);
  });
  it('L2 starts exactly at 300', () => {
    assert.deepEqual(levelForXp(300), { level: 2, intoLevel: 0, forNextLevel: 300 });
    assert.deepEqual(levelForXp(450), { level: 2, intoLevel: 150, forNextLevel: 300 });
  });
  it('L4 starts exactly at 1000', () => {
    assert.deepEqual(levelForXp(1000), { level: 4, intoLevel: 0, forNextLevel: 500 });
  });
  it('clamps negative XP to level 1', () => {
    assert.equal(levelForXp(-42).level, 1);
  });
  it('intoLevel + remaining always sums to forNextLevel', () => {
    for (let xp = 0; xp <= 2000; xp += 37) {
      const { intoLevel, forNextLevel } = levelForXp(xp);
      assert.equal(intoLevel >= 0 && intoLevel <= forNextLevel, true);
      assert.equal(forNextLevel > 0, true);
    }
  });
});
