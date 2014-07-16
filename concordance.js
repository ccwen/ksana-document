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
var texts=[],starts=[],ends=[];
var config=null,engine=null;
var nest=0;
var verbose=false;

var scanpage=function(obj,npage,pat,backward) {
	var page=texts[npage];
	page.replace(pat,function(m,m1){
			if (!obj[m1]) obj[m1]=[];
			var o=obj[m1];
			if (o[o.length-1]!=npage) o.push(npage);
	});
}
var trimunfrequent=function(out,total,config) {
	for (var i=0;i<out.length;i++) {
		var hit=out[i][1].length;
		if ( (hit / total) < config.threshold || hit < config.threshold_count) {
			out.length=i;
			break;
		}
	}
}
var findNeighbors=function(filter,q,backward) {
	var cjkbmp="([\\u4E00-\\u9FFF])";
	if (verbose) console.log("findn",q,filter.length,backward)
	var p=q+cjkbmp;
	nest++;
	if (backward) terms=starts;
	else terms=ends;

	if (backward) p=cjkbmp+q ;  //starts

	var pat=new RegExp(p,"g");
	var obj={},out=[];
	for (var i=0;i<filter.length;i++) {
		var npage=i;
		if (typeof filter[i]=="number") npage=filter[i];
		scanpage(obj,npage,pat,backward);
	}
	for (var i in obj) out.push([i,obj[i]]);
	out.sort(function(a,b){return b[1].length-a[1].length});

	var total=0;
	for (var i=0;i<out.length;i++) total+=out[i][1].length;

	trimunfrequent(out,total,config);
	var newterms=[];
	if (nest<5) for (var i=0;i<out.length;i++) {
		var term=q+out[i][0];
		var termhit=out[i][1].length;
		if (backward) term=out[i][0]+q;
		var childterms=findNeighbors(out[i][1],term,backward);

		terms.push([term,termhit,q]);

		if (childterms.length==1 && childterms[0][1]/config.mid_threshold > termhit) {
			terms[terms.length-1][3]=childterms[0][0];
		}
		newterms.push([term,termhit,q]);
	}
	nest--;
	return newterms;
}

var finalize=function() {
	if (verbose) console.timeEnd("fetchtext");
	if (verbose) console.time("neighbor");
	findNeighbors(texts,config.q,false); //forward
	findNeighbors(texts,config.q,true); //backward	
	starts.sort(function(a,b){return b[1]-a[1]});
	ends.sort(function(a,b){return b[1]-a[1]});
	status.output={
		totalpagecount:engine.get("meta").pagecount,
		pagecount:texts.length,starts:starts,ends:ends};
	if (verbose) console.timeEnd("neighbor");
	status.done=true;
}
var opts={nohighlight:true};

var worker=function() {
	var Q=this;
	var pages=Q.pageWithHit(this.now);
	status.progress=this.now/Q.byFile.length;
	for (var j=0;j<pages.length;j++) {
		texts.push( engine.getSync(["fileContents",this.now,pages[j]]));	
	}
	this.now++
	if (this.now<Q.byFile.length) {
		setImmediate( worker.bind(this)) ;
		if (forcestop || Q.excerptStop) 	finalize();
	} else finalize();
}

var start=function(_config) {
	if (verbose) console.time("search");
	config=_config;
	config.threshold=config.threshold||0.005;
	config.threshold_count=config.threshold_count||20;
	config.mid_threshold=config.mid_threshold || 0.9 ; //if child has 80% hit, remove parent
	config.termlimit=config.termlimit||500;
	config.nestlevel=config.nestlevel||5;
	var open=Kde.open;
	if (typeof Require=="undefined") open=Kde.openLocal;

	open(config.db,function(_engine){
		engine=_engine;
		search(engine,config.q,opts,function(Q){
			Q.now=0;
			if (verbose) console.timeEnd("search");
			if (verbose) console.time("fetchtext");
			worker.call(Q);
		});
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