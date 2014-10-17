
var Kdb=require("ksana-document").kdb;
var paths=["postings","1"];
var fn="xml4kdb-test.kdb"
var data1,data2,data3;
/*
	return address only, for merging posting at server side
	avoid transfering big posting to client side
*/
new Kdb(fn,{},function(db){
		db.get(paths,{address:true,recursive:true},function(_data1){
			console.log("1",_data1);
			db.get(paths,{address:false,recursive:true},function(_data2){
				console.log("2",_data2);//now data already in cache, see if get address still valid
				db.get(paths,{address:true},function(_data3){
					console.log("3",_data3);
					console.log("same",JSON.stringify(_data1)==JSON.stringify(_data3));
				});

			});	

		});
});