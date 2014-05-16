/*
  Ksana Search Engine.

  need a KDE instance to be functional

*/
var search=require("./search");


var _search=function(engine,q,opts,cb) {
	search.main(engine,q,opts,cb);	
}

var api={
	search:_search
}
module.exports=api;