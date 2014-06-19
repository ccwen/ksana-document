var fs=require('fs');
var Kdbw=require('../kdbw');
var Kdb=require('../kdb');
console.log('ydbw test');
var json={

  "pageNames": [""]
}

var kdb=Kdbw();
kdb.save(json);
var fn="wrong.kdb";
kdb.writeFile(fn,function(total,written) {
	console.log('total',total,'written',written);
	if (total==written) {
		console.log(true)
		testread();

	}
});

var testread=function() {
	kdb=new Kdb("wrong.kdb");
	kdb.get(["pageNames"],true,function(data){
		console.log("DATA",data)
	})
}