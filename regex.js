/*
   regex search.
   scan only possible pages

   remove regular expression operator  ^ $  [  ]  {  }  (  )  . \d \t \n

   $,^  begin and end not supported 
   support [^] exclusion later

   report match term with hit
*/
var search=require("./search");
var Kde=require("./kde");
var status={progress:0}, forcestop=false;
var texts=[],terms=[];
var config=null,engine=null;

var opts={nohighlight:true, range:{filestart:0, maxfile:100}};

var worker=function() {
	search(engine,config.q_unregex,opts,function(Q){
		var excerpts=Q.excerpt.map(function(q){return q.text.replace(/\n/g,"")});
		texts=texts.concat(excerpts);
		opts.range.filestart=opts.range.nextFileStart;
		status.progress=opts.range.nextFileStart/Q.byFile.length;
		if (forcestop || Q.excerptStop) {
			finalize();
		} else setTimeout(worker,0);
	});
}

var filter=function() {
	var pat=new RegExp(config.q,"g");
	var matches={};
	
	for (var i=0;i<texts.length;i++) {
		var m=texts[i].match(pat);
		if (m) {
			for (var j=0;j<m.length;j++) {
				if (!matches[m[j]]) matches[m[j]]=0;
				matches[m[j]]++;
			}
		}
	}

	terms=[];
	for (var i in matches) {
		if (matches[i]>=config.threshold) terms.push( [i,matches[i]]);	
	} 
	terms.sort(function(a,b){return b[1]-a[1]});
	return terms;
}
var finalize=function() {
	filter();
	status.output={
		totalpagecount:engine.get("meta").pagecount,
		pagecount:texts.length,
		terms:terms
	};
	status.done=true;
}
var unregex=function(q) {
	var out=q.replace(/\.+/g," ");
	out=out.replace(/\\./g," "); //remove \d \n \t
	return out;
}
var start=function(_config){
	config=_config;
	var open=Kde.open;
	config.threshold=config.threshold||5;
	if (typeof Require=="undefined") open=Kde.openLocal;
	config.q_unregex=unregex(config.q);
	open(config.db,function(_engine){
		engine=_engine;
		setTimeout(worker,0);
	});
}
var stop=function() {
	forcestop=true;
}

var getstatus=function() {
	return status;
}
module.exports={start:start,stop:stop,status:getstatus};