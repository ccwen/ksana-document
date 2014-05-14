var fs=require('fs');
var Ydbw=require('../ydbw');
console.log('ydbw test');
var json={
	a:1,
	b:"string",
	c:[1,2,3],
	d:[4,3,2],
	e:["abc","xyz"],
	f:{p:1,q:"abc",r:[7,8,9]}
}
json.d.unsorted=true;

QUnit.asyncTest('write json',function(){
	var ydb=Ydbw();
	ydb.save(json);
	var fn="test.ydb";
	ydb.writeFile(fn,function(total,written) {
		console.log('total',total,'written',written);
		if (total==written) {
			equal(true,true);
			start();
		}
	});
});