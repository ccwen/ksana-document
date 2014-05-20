var kde=require("../kde");

var engine=null;
var dbid="ccc";

QUnit.asyncTest("get",function(){
	kde.open(dbid,function(res){
		engine=res;
		equal(engine.traffic,0);
		start();
	});
})

QUnit.asyncTest("get meta",function(){
	engine.get("meta",function(res){
		equal(res.name,dbid);
		equal(engine.traffic,0); //no traffic fetching meta
		start();
	});
});
var repeatkey=["tokens","君"];
QUnit.asyncTest("gets",function() {
	var keys=[	repeatkey, ["tokens","子"]];
	engine.get(keys,function(res) {
		equal(engine.traffic,1);
		start();
	});
});

QUnit.asyncTest("repeat key",function() {
	engine.get(repeat,function(res) {
		equal(engine.traffic,1); //repeat key already in cache
		start();
	});
});