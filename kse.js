var search=require("./search");
var kde=require("./kde");


var _search=function(opts,cb) {

	kde.open(opts.db,function(engine){
		var out={options:opts};
		if (!engine) {
			cb(out);
		}
		var q=opts.q||opts.query;
		if (!q) return out;

		search.main(engine,q,opts,cb);		
	});
}

var api={
	search:_search
}
module.exports=api;