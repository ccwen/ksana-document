/*
  Ksana Search Engine.

  need a KDE instance to be functional

*/
var search=require("./search");
var D=require("./document");

var _search=function(engine,q,opts,cb) {
	search.main(engine,q,opts,cb);	
}
var toDoc=function(pagenames,texts,parents) {
	var d=D.createDocument();
	for (var i=0;i<texts.length;i++) {
		d.createPage({n:pagenames[i],t:texts[i],p:parents[i]});
	}
	return d;
}
var getDocument=function(engine,filename,cb){
	var filenames=engine.get("fileNames");
	var files=engine.get("files");
	var i=filenames.indexOf(filename);
	if (i==-1) {
		cb(null);
	} else {
		var pagenames=files[i].pageNames;
		var parentId=files[i].parentId;
		engine.get(["fileContents",i],true,function(data){
			cb(toDoc(pagenames,data,parentId));
		})
	}
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
	,getDocument:getDocument
}
module.exports=api;