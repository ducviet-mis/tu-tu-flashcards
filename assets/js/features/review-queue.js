/* One review queue for personal days and explicitly studied fixed-topic cards. */
'use strict';
function needsReviewCatalog(){return !topicData&&Object.keys(topicProgress).length>0;}
async function loadReviewCatalog(){if(!topicData)topicData=await topicStore.load();return topicData;}
function reviewQueue(today=C.isoToday(),mode='due'){
 const rows=ReviewEngine.queue(days,today,mode);
 if(topicData)for(const deck of topicData.topics){
  const words=deck.words.filter(w=>Object.prototype.hasOwnProperty.call(topicProgress,deck.id+':'+w.id)).map(w=>topicReviewWord(deck,w));
  for(const word of words){const date=word.lastReviewed||today;if(ReviewEngine.queue([{date,words:[word]}],today,mode).length)rows.push({date,word,topic:deck.id,topicTitle:deck.title});}
 }
 return rows.sort((a,b)=>(a.word.remembered&&a.word.nextReview||a.date).localeCompare(b.word.remembered&&b.word.nextReview||b.date));
}
function reviewCount(today=C.isoToday(),mode='due'){
 if(topicData)return reviewQueue(today,mode).length;
 const words=Object.values(topicProgress).map(v=>typeof v==='boolean'?{remembered:v}:v);
 return ReviewEngine.queue(days,today,mode).length+ReviewEngine.queue([{date:today,words}],today,mode).length;
}
