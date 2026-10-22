/* Pure scheduling rules. No DOM, network or storage; testable on its own. */
'use strict';
globalThis.ReviewEngine = (() => {
  const intervals = [1, 3, 7, 14, 30];
  function addDays(date, amount) {
    const value = new Date(date + 'T12:00:00Z');
    value.setUTCDate(value.getUTCDate() + amount);
    return value.toISOString().slice(0, 10);
  }
  function setRemembered(word, known, today) {
    // Extra practice before the due date must not advance the memory level.
    if (known && word.remembered && word.nextReview > today) return word;
    const level = word.remembered ? Math.max(0, Math.min(5, word.reviewLevel || 0)) : 0;
    word.remembered = known;
    word.reviewLevel = known ? Math.min(5, level + 1) : 0;
    word.nextReview = known ? addDays(today, intervals[Math.min(level, 4)]) : today;
    return word;
  }
  function grade(word, known, today) {
    setRemembered(word, known, today);
    word.lastReviewed = today;
    word.reviewCount = (word.reviewCount || 0) + 1;
    return word;
  }
  function queue(days, today, mode = 'due') {
    return days.flatMap(day => day.words.map(word => ({ date: day.date, word })))
      .filter(({ word }) => mode === 'all' || (mode === 'unknown' ? !word.remembered : !word.remembered || !word.nextReview || word.nextReview <= today))
      .sort((a, b) => (a.word.remembered && a.word.nextReview || a.date).localeCompare(b.word.remembered && b.word.nextReview || b.date));
  }
  function streak(activity, today) {
    let cursor = activity[today]?.reviewed ? today : addDays(today, -1), count = 0;
    while (activity[cursor]?.reviewed) { count++; cursor = addDays(cursor, -1); }
    return count;
  }
  return { intervals, addDays, setRemembered, grade, queue, streak };
})();
