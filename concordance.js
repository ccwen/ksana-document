/*
  concordance without suffix array.
*/
var search=require("./search");
var excerpt=excerpt=require("./excerpt");

var concordance=function(engine,q,opts,cb) {
	search.main(engine,q,opts,function(Q){
		cb(Q.excerpt);
	})
}
module.exports=concordance;