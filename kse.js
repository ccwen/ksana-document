/*
  Ksana Search Engine.

  need a KDE instance to be functional

*/
var search=require("./search");


var _search=function(engine,q,opts,cb) {
	search.main(engine,q,opts,cb);	
}

var _highlightPage=function(engine,pagename,opts,cb){
	if (opts.q) {
		search.main(engine,opts.q,opts,function(Q){
			api.excerpt.highlightPage(Q,pagename,opts,cb);
		});
	} else {
		api.excerpt.getPageByName(engine,pagename,cb);
	}
}
var api={
	search:_search
	,highlightPage:_highlightPage
	,excerpt:require("./excerpt")
}
module.exports=api;