/*
  concordance without suffix array.

  法 takes 25 seconds.

  improvement:
	less page scan.        
*/
var search=require("./search");
var Kde=require("./kde");
var excerpt=excerpt=require("./excerpt");
var status={progress:0}, forcestop=false;
var texts=[],terms=[];
var config=null,engine=null;
var nest=0;
var findNeighbors=function(texts,q,backward) {
	nest++;
	var p=q+"(..)";
	if (backward) p="(..)"+q ;  //starts

	var pat=new RegExp(p,"g");

	var obj={},unigram="",more=[];
	for (var i=0;i<texts.length;i++) {
		texts[i].replace(pat,function(m,m1){
			var c=m1.charCodeAt(0);
			if (c>=0xD800 && c<0xDC00) unigram=m1;
			else {
				if (backward) unigram=m1.substr(1);
				else unigram=m1.substr(0,1);
			}
			c=unigram.charCodeAt(0);
			if (c<0x4e00 || c>0x9fff) return;

			if (!obj[unigram]) obj[unigram]=0;
			obj[unigram]++;
		});
	}
	var out=[];
	for (var i in obj) out.push([i,obj[i]]);
	out.sort(function(a,b){return b[1]-a[1]});

	var total=0;
	for (var i=0;i<out.length;i++) total+=out[i][1];

	for (var i=0;i<out.length;i++) {
		if ( (out[i][1] / total) < config.threshold || out[i][1] < config.threshold_count) {
			out.length=i;
			break;
		}
	}
	if (terms.length<config.termlimit) {
		for (var i=0;i<out.length;i++) {
			if (out[i][1] / total > config.threshold2 && out[i][1]>config.threshold2_count && nest<config.nestlevel) {
				var newq=q+out[i][0];
				if (backward) newq= out[i][0]+q;
				var r=findNeighbors(texts,newq,backward);
				terms.push([newq,out[i][1]]);
				if (terms.length>=config.termlimit) break;
			}
		}		
	}
	nest--;
	return out;
}

var finalize=function() {
	var starts=findNeighbors(texts,config.q,false); //forward
	var ends=findNeighbors(texts,config.q,true); //backward	
	terms.sort(function(a,b){return b[1]-a[1]});
	status.output={
		totalpagecount:engine.get("meta").pagecount,
		pagecount:texts.length,starts:starts,ends:ends,terms:terms
	};

	status.done=true;
}
var opts={nohighlight:true, range:{filestart:0, maxfile:100}};
var worker=function() {
	search(engine,config.q,opts,function(Q){
		var excerpts=Q.excerpt.map(function(q){return q.text.replace(/\n/g,"")});
		texts=texts.concat(excerpts);
		opts.range.filestart=opts.range.nextFileStart;
		status.progress=opts.range.nextFileStart/Q.byFile.length;
		if (forcestop || Q.excerptStop) {
			finalize();
		}else setTimeout(worker,0);
	});
}
var start=function(_config) {
	config=_config;
	config.threshold=config.threshold||0.005;
	config.threshold2=config.threshold2||0.02;
	config.threshold_count=config.threshold_count||20;
	config.threshold2_count=config.threshold2_count||100;
	config.termlimit=config.termlimit||500;
	config.nestlevel=config.nestlevel||5;
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