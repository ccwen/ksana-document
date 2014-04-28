var M=require('../markup');
console.log('markup test suite');

QUnit.test('insert',function(){
	var markups=M.quantize({s:6,l:2,payload:{text:"abc",insert:true}});
	equal(markups.length,1);
	equal(markups[0].s,7);
	equal(markups[0].l,1);
});

QUnit.test('delete',function(){
	var markups=M.quantize({s:6,l:3,payload:{text:""}});
	equal(markups.length,3);
	equal(markups[0].s,6);
	equal(markups[0].l,1);
	equal(markups[0].payload.text,"");
	equal(markups[1].s,7);
	equal(markups[1].l,1);
	equal(markups[1].payload.text,"");
	equal(markups[2].s,8);
	equal(markups[2].l,1);
	equal(markups[2].payload.text,"");	
});

QUnit.test('replace',function(){
	var markups=M.quantize({s:6,l:3,payload:{text:"abc"}});
	equal(markups.length,3);
	equal(markups[0].s,6);
	equal(markups[0].l,1);
	equal(markups[0].payload.text,"");
	equal(markups[1].s,7);
	equal(markups[1].l,1);
	equal(markups[1].payload.text,"");
	equal(markups[2].s,8);
	equal(markups[2].l,1);
	equal(markups[2].payload.text,"abc");

});

QUnit.test('combine1',function(){
	var markups=[
		{"s":7,"l":1,"payload":{"type":"suggest","text":"a","author":"a1"}},
  	{"s":7,"l":1,"payload":{"type":"suggest","text":"b","author":"a2"}},
		{"s":8,"l":1,"payload":{"type":"suggest","text":"c","author":"b1"}},
  	{"s":8,"l":1,"payload":{"type":"suggest","text":"d","author":"b2"}},
  	{"s":9,"l":1,"payload":{"type":"suggest","text":"e","author":"c1"}}
 	]
 	var out=M.merge(markups,"suggest");

 	equal(out.length,3);
 	equal(out[0].payload.type,"suggests");
 	equal(out[0].payload.choices.length,2);
 	equal(out[0].payload.choices[0].author,"a1");
});

QUnit.test('combine2',function(){
	var markups=[
		{"s":6,"l":4,"payload":{"type":"suggest","text":"a","author":"a1"}},
  	{"s":9,"l":1,"payload":{"type":"suggest","text":"b","author":"a2"}}
  ];

  var out=M.merge(markups,"suggest");
  console.log(out);
  equal(out.length,2);
 	equal(out[0].payload.type,"suggests");
 	equal(out[0].payload.choices.length,1);
 	equal(out[0].l,3);
 	equal(out[0].payload.choices[0].text,"");
 	equal(out[0].payload.choices[0].author,"a1");

	equal(out[1].payload.choices.length,2);
	console.log(out[1].payload.choices)
});


QUnit.test('to and from token unit',function(){
	var markups=[
		{"start":0,"len":4,"payload":{"type":"suggest","text":"a","author":"a1"}},
  	{"start":4,"len":5,"payload":{"type":"suggest","text":"b","author":"a2"}},
  	{"start":9,"len":8,"payload":{"type":"suggest","text":"c","author":"a3"}}
  ];
  
  var offsets=[0,4,9,14,17];
	M.addTokenPos(markups,offsets);
	equal(markups[0].s,0);
	equal(markups[1].s,1);
	equal(markups[2].s,2);
	equal(markups[2].l,2);

	M.applyTokenPos(markups,offsets);
	equal(typeof markups[0].s,'undefined');
	equal(typeof markups[1].s,'undefined');
	equal(typeof markups[2].s,'undefined');	
	equal(typeof markups[2].l,'undefined');
	
})