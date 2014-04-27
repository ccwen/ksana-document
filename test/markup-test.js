var M=require('../markup');
console.log('markup test suite');

QUnit.test('insert',function(){
	var markups=M.quantize({start:6,len:2,payload:{text:"abc",insert:true}});
	equal(markups.length,1);
	equal(markups[0].start,7);
	equal(markups[0].len,1);
});

QUnit.test('delete',function(){
	var markups=M.quantize({start:6,len:3,payload:{text:""}});
	equal(markups.length,3);
	equal(markups[0].start,6);
	equal(markups[0].len,1);
	equal(markups[0].payload.text,"");
	equal(markups[1].start,7);
	equal(markups[1].len,1);
	equal(markups[1].payload.text,"");
	equal(markups[2].start,8);
	equal(markups[2].len,1);
	equal(markups[2].payload.text,"");	
});

QUnit.test('replace',function(){
	var markups=M.quantize({start:6,len:3,payload:{text:"abc"}});
	equal(markups.length,3);
	equal(markups[0].start,6);
	equal(markups[0].len,1);
	equal(markups[0].payload.text,"");
	equal(markups[1].start,7);
	equal(markups[1].len,1);
	equal(markups[1].payload.text,"");
	equal(markups[2].start,8);
	equal(markups[2].len,1);
	equal(markups[2].payload.text,"abc");

});

QUnit.test('combine1',function(){
	var markups=[
		{"start":7,"len":1,"payload":{"type":"suggest","text":"a","author":"a1"}},
  	{"start":7,"len":1,"payload":{"type":"suggest","text":"b","author":"a2"}},
		{"start":8,"len":1,"payload":{"type":"suggest","text":"c","author":"b1"}},
  	{"start":8,"len":1,"payload":{"type":"suggest","text":"d","author":"b2"}},
  	{"start":9,"len":1,"payload":{"type":"suggest","text":"e","author":"c1"}}
 	]
 	var out=M.merge(markups,"suggest");

 	equal(out.length,3);
 	equal(out[0].payload.type,"suggests");
 	equal(out[0].payload.choices.length,2);
 	equal(out[0].payload.choices[0].author,"a1");
});

QUnit.test('combine2',function(){
	var markups=[
		{"start":6,"len":4,"payload":{"type":"suggest","text":"a","author":"a1"}},
  	{"start":9,"len":1,"payload":{"type":"suggest","text":"b","author":"a2"}}
  ];

  var out=M.merge(markups,"suggest");
  console.log(out);
  equal(out.length,2);
 	equal(out[0].payload.type,"suggests");
 	equal(out[0].payload.choices.length,1);
 	equal(out[0].len,3);
 	equal(out[0].payload.choices[0].text,"");
 	equal(out[0].payload.choices[0].author,"a1");

	equal(out[1].payload.choices.length,2);
	console.log(out[1].payload.choices)
});