/*
  concordance without suffix array.
*/
var search=require("./search");
var Kde=require("./kde");
var excerpt=excerpt=require("./excerpt");
var status={progress:0}, forcestop=false;
var texts=[], opts={range:{filestart:0, maxfile:100}};
var config=null,engine=null;

var startpat=/(..)<hl/g ;
var endpat=/<\/hl>(..)/g;


var finalize=function() {
	var starts2={},starts={},ends2={},ends={}, unigram="";
	for (var i=0;i<texts.length;i++) {

		texts[i].replace(startpat,function(m,m1){
			if (!starts2[m1]) starts2[m1]=0;
			starts2[m1]++;		
			var c=m1.charCodeAt(0);
			if (c>=0xD800 && c<0xDC00) unigram=m1;
			else unigram=m1.substr(1);

			if (!starts[unigram]) starts[unigram]=0;
			starts[unigram]++;
		});

		texts[i].replace(endpat,function(m,m2){
			if (!ends2[m2]) ends2[m2]=0;
			ends2[m2]++;

			var c=m2.charCodeAt(0);
			if (c>=0xD800 && c<0xDC00) unigram=m2;
			else unigram=m2.substr(0,1);

			if (!ends[unigram])  ends[unigram]=0;
			ends[unigram]++;
		});
	}

	var ends2arr=[],endsarr=[],starts2arr=[],startsarr=[];

	for (var i in starts2) starts2arr.push([i,starts2[i]]);
	for (var i in starts) startsarr.push([i,starts[i]]);
	starts2arr.sort(function(a,b){return b[1]-a[1]});
	startsarr.sort(function(a,b){return b[1]-a[1]});

	for (var i in ends2) 	ends2arr.push([i,ends2[i]]);
	for (var i in ends) 	endsarr.push([i,ends[i]]);
	ends2arr.sort(function(a,b){return b[1]-a[1]});
	endsarr.sort(function(a,b){return b[1]-a[1]});

	status.output={starts:startsarr,starts2:starts2arr,ends:endsarr,ends2:ends2arr}
	status.done=true;
}
var worker=function() {
	search.main(engine,config.q,opts,function(Q){
		texts=texts.concat(Q.excerpt.map(function(q){return q.text}));
		opts.range.filestart=opts.range.nextFileStart;
		status.progress=opts.range.nextFileStart/Q.byFile.length;
		if (forcestop || Q.excerptStop) {
			finalize();
		}else setTimeout(worker,0);
	});
}
var start=function(_config) {
	config=_config;
	var open=Kde.open;
	if (typeof Require=="undefined") open=Kde.openLocal;

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

//module.exports=concordance;