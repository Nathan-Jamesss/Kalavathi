const {test}=require('node:test');const assert=require('node:assert/strict');
const {summary,over,mayAct}=require('../static/hospital');const {make}=require('../static/hospital-fixtures');
test('record assessment derives its explanation from actual outcomes',()=>{
  assert.equal(summary(make('clean').record).label,'CLEAN RECORD');
  assert.equal(summary({...make('bad').record,summary_tier:'clean'}).label,'UNCONFIRMED CLAIMS ON RECORD');
  assert.equal(summary({history:[{outcome:'self-cancelled'}]}).label,'MIXED RECORD');
  assert.equal(summary({history:[]}).label,'MIXED RECORD');
});
test('hospital actions fail closed on invalid signatures and inactive requests',()=>{
  assert.equal(mayAct(make('clean')),true);assert.equal(over(make('over')),true);
  for(const kind of ['invalid','cancelled','handled'])assert.equal(mayAct(make(kind)),false);
  assert.equal(mayAct({...make('clean'),signature_valid:'true'}),false);
  assert.equal(mayAct({...make('clean'),signature_valid:undefined}),false);
});
