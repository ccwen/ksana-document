/*
  Ksana Search Engine.

  need a KDE instance to be functional

*/
var search=require("./search");

var _search=function(engine,q,opts,cb) {
	return search.main(engine,q,opts,cb);	
}


var _highlightPage=function(engine,fileid,pageid,opts,cb){
	if (opts.q) {
		search.main(engine,opts.q,opts,function(Q){
			api.excerpt.highlightPage(Q,fileid,pageid,opts,cb);
		});
	} else {
		api.excerpt.getPage(engine,fileid,pageid,cb);
	}
}
var api={
	search:_search
	,concordance:require("./concordance")
	,highlightPage:_highlightPage
	,excerpt:require("./excerpt")
}
module.exports=api;