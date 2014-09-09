//saveMarkup({dbid:dbid,markups:markups,filename:filename,i:this.state.pageid } ,function(data){

var saveMarkup=function(payload,cb){
	for (var i=0;i<payload.markups.length;i++) {
		payload.markups[i].i=payload.i;
	}
	localStorage.setItem("M!"+payload.i+"!"+payload.filename,JSON.stringify(payload.markups));
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