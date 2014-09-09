//saveMarkup({dbid:dbid,markups:markups,filename:filename,i:this.state.pageid } ,function(data){
//TODO , change to pouchdb
var combineMarkups=function(markups,fn,pageid) {
	var existing=JSON.parse(localStorage.getItem("M!"+pageid+"!"+fn));
	if (!markups || !markups.length) return existing;

	var author=markups[0].payload.author, others=[];
	var mfn=fn+'m';

	if (existing) {
		others=existing.filter(function(m){return m.i!=pageid || m.payload.author != author});		
	}
	
	for (var i=0;i<markups.length;i++) {
		markups[i].i=pageid;
	}
	others=others.concat(markups);
	var sortfunc=function(a,b) {
		//each page less than 64K
		return (a.i*65536 +a.start) - (b.i*65536 +b.start);
	}
	others.sort(sortfunc);
	return others;
}

var saveMarkup=function(opts,cb){
	var markups=combineMarkups(opts.markups,opts.filename,opts.i);

	for (var i=0;i<markups.length;i++) {
		markups[i].i=opts.i;
	}
	localStorage.setItem("M!"+opts.i+"!"+opts.filename,JSON.stringify(markups));
	setTimeout(cb,1);
}
var __loadMarkups=function(key,pagecount,cb) {
	var data=[];
	for (var i=1;i<pagecount;i++) {
		var arr=JSON.parse(localStorage.getItem("M!"+i+"!"+key));
		if (arr && arr.length) data=data.concat(arr);	
	}
	setTimeout(function(){
		cb(data);
	},1);
}
var loadMarkup=function(key,pageid,cb) {
	if (pageid<0) {
		__loadMarkups(key,-pageid,cb);
		return;
	}
	var data=JSON.parse(localStorage.getItem("M!"+pageid+"!"+key));
	setTimeout(function(){
		cb(data);
	},1);
}

module.exports={
	saveMarkup:saveMarkup,
	loadMarkup:loadMarkup
}