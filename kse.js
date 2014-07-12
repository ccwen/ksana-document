/*
  Ksana Search Engine.

  need a KDE instance to be functional
  
*/

var _search=function(engine,q,opts,cb) {
	if (typeof engine=="string") {//browser only
		//search on remote server
		var kde=Require("ksana-document").kde;
		var $kse=Require("ksanaforge-kse").$yase; 
		opts.dbid=engine;
		opts.q=q;
		$kse.search(opts,cb);
	} else {//nw or brower
		return require("./search").main(engine,q,opts,cb);		
	}
}

var _highlightPage=function(engine,fileid,pageid,opts,cb){
	if (opts.q) {
		require("./search").main(engine,opts.q,opts,function(Q){
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