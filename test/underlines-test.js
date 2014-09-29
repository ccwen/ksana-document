// [ markupid, middle/start/end/unit , level]

var markup=require("../underlines");

QUnit.test("yakov tag rendering algorithm",function(){
	var m=[
		[2,3,"X"],
		[1,2,"Y"]
	];
	var tokens=["a","b","c","d","e"];

	var res=markup.calculateLevels(m);
	deepEqual(res,[ [0,0],[1,1]]);

	var s=markup.renderXML(tokens,m);
	equal(s,"a<Y lv=\"1\">b<X lv=\"0\">c</X></Y><X lv=\"0\">de</X>" );
	
});
/*
QUnit.test("overlap",function(){
	var m=[
		[1,3,"X"],
		[0,2,"Y"]
	];
	var res=markup.calculateLevel(m);
	equal(res.length,4);
	deepEqual(res,[ 
		[[1,1,0]], 
		[[1,2,0],[0,1,1]], 
		[[0,0,1]],
		[[0,2,1]] 
	]);

	//var xml=markup.renderXML(["a","b","c","d"],m,res);
	//equal(xml,"<Y>a<X>b</X></Y><X>cd</X>")
});


QUnit.test("unit length token",function(){
	var m=[
		[0,1],
		[1,2]
	];
	var res=markup.calculateLevel(m);
	equal(res.length,3);
	deepEqual(res,[ 
		[[0,3,0]], 
		[[1,1,0]], 
		[[1,2,0]],
	]);
});
*/
