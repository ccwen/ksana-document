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

var scanpage=function(obj,npage,pat,backward) {
	var unigram="";
	var page=texts[npage];
	page.replace(pat,function(m,m1){
			var c=m1.charCodeAt(0);
			if (c>=0xD800 && c<0xDC00) unigram=m1;
			else {
				if (backward) unigram=m1.substr(1);
				else unigram=m1.substr(0,1);
			}
			c=unigram.charCodeAt(0);
			if (c<0x4e00 || c>0x9fff) return;

			if (!obj[unigram]) obj[unigram]=[];
			var o=obj[unigram];
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
	nest++;
	//console.log("findn",q,filter.length,backward)
	var p=q+"(..)";
	if (backward) p="(..)"+q ;  //starts

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
		newterms.push([term,termhit]);
		var childterms=findNeighbors(out[i][1],term,backward);
		if (childterms.length && childterms[0][1]*1.3>termhit )  {
			terms.push([childterms[0][0],childterms[0][1]]);
		//	return [];
		} else {
			//check duplicate terms
			if (!terms.length || terms[terms.length-1][0]!=term) terms.push([term,termhit]);
		}
	}
	nest--;
	return newterms;
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
		search(engine,config.q,opts,function(Q){
			Q.now=0;
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