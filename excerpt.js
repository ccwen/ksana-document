var plist=require("./plist");

var getPhraseWidths=function (Q,phraseid,voffs) {
	var res=[];
	for (var i in voffs) {
		res.push(getPhraseWidth(Q,phraseid,voffs[i]));
	}
	return res;
}
var getPhraseWidth=function (Q,phraseid,voff) {
	var P=Q.phrases[phraseid];
	var width=0,varwidth=false;
	if (P.termid.length<2) return P.termid.length;
	var lasttermposting=Q.terms[P.termid[P.termid.length-1]].posting;

	for (var i in P.termid) {
		var T=Q.terms[P.termid[i]];
		if (T.op=='wildcard') {
			width+=T.width;
			if (T.wildcard=='*') varwidth=true;
		} else {
			width++;
		}
	}
	if (varwidth) { //width might be smaller due to * wildcard
		var at=plist.indexOfSorted(lasttermposting,voff);
		var endpos=lasttermposting[at];
		if (endpos-voff<width) width=endpos-voff+1;
	}

	return width;
}
/* return [voff, phraseid, phrasewidth, optional_tagname] by slot range*/
var hitInRange=function(Q,startvoff,endvoff) {
	var res=[];
	if (!Q || !Q.rawresult.length) return res;
	for (var i=0;i<Q.phrases.length;i++) {
		var P=Q.phrases[i];
		if (!P.posting) continue;
		var s=plist.indexOfSorted(P.posting,startvoff);
		var e=plist.indexOfSorted(P.posting,endvoff);
		var r=P.posting.slice(s,e);
		var width=getPhraseWidths(Q,i,r);

		res=res.concat(r.map(function(voff,idx){ return [voff,i,width[idx]] }));
	}
	// order by voff, if voff is the same, larger width come first.
	// so the output will be
	// <tag1><tag2>one</tag2>two</tag1>
	//TODO, might cause overlap if same voff and same width
	//need to check tag name
	res.sort(function(a,b){return a[0]==b[0]? b[2]-a[2] :a[0]-b[0]});

	return res;
}

/*
given a vpos range start, file, convert to filestart, fileend
   filestart : starting file
   start   : vpos start
   showfile: how many files to display
   showpage: how many pages to display

output:
   array of fileid with hits
*/
var getFileWithHits=function(engine,Q,range) {
	var fileOffsets=engine.get("fileOffsets");
	var out=[],filecount=100;
	if (range.start) {
		var first=range.start , start=0 , end;
		for (var i=0;i<fileOffsets.length;i++) {
			if (fileOffsets[i]>first) break;
			start=i;
		}		
	} else {
		start=range.filestart || 0;
		if (range.maxfile) {
			filecount=range.maxfile;
		} else if (range.showpage) {
			throw "not implement yet"
		}
	}

	var fileWithHits=[],totalhit=0;
	range.maxhit=range.maxhit||1000;

	for (var i=start;i<Q.byFile.length;i++) {
		if(Q.byFile[i].length>0) {
			totalhit+=Q.byFile[i].length;
			fileWithHits.push(i);
			range.nextFileStart=i;
			if (fileWithHits.length>=filecount) break;
			if (totalhit>range.maxhit) break;
		}
	}
	if (i>=Q.byFile.length) { //no more file
		Q.excerptStop=true;
	}
	return fileWithHits;
}
var resultlist=function(engine,Q,opts,cb) {
	var output=[];
	if (!Q.rawresult || !Q.rawresult.length) {
		cb(output);
		return;
	} 
	if (opts.range) {
		if (opts.range.maxhit && !opts.range.maxfile) {
			opts.range.maxfile=opts.range.maxhit;
		}
	}
	var fileWithHits=getFileWithHits(engine,Q,opts.range);
	if (!fileWithHits.length) {
		cb(output);
		return;
	}

	var output=[],files=[];//temporary holder for pagenames
	for (var i=0;i<fileWithHits.length;i++) {
		var nfile=fileWithHits[i];
		var pageOffsets=engine.getFilePageOffsets(nfile);
		var pageNames=engine.getFilePageNames(nfile);
		files[nfile]={pageOffsets:pageOffsets};
		var pagewithhit=plist.groupbyposting2(Q.byFile[ nfile ],  pageOffsets);
		//if (pageOffsets[0]==1)
		//pagewithhit.shift(); //the first item is not used (0~Q.byFile[0] )

		for (var j=0; j<pagewithhit.length;j++) {
			if (!pagewithhit[j].length) continue;
			//var offsets=pagewithhit[j].map(function(p){return p- fileOffsets[i]});
			output.push(  {file: nfile, page:j,  pagename:pageNames[j]});
		}
	}

	var pagekeys=output.map(function(p){
		return ["fileContents",p.file,p.page];
	});
	//prepare the text
	engine.get(pagekeys,function(pages){
		var seq=0;
		if (pages) for (var i=0;i<pages.length;i++) {
			var startvpos=files[output[i].file].pageOffsets[output[i].page-1];
			var endvpos=files[output[i].file].pageOffsets[output[i].page];
			var hl={};

			if (opts.range && opts.range.start && startvpos<opts.range.start ) {
				startvpos=opts.range.start;
			}
			
			if (opts.nohighlight) {
				hl.text=pages[i];
				hl.hits=hitInRange(Q,startvpos,endvpos);
			} else {
				var o={text:pages[i],startvpos:startvpos, endvpos: endvpos, Q:Q,fulltext:opts.fulltext};
				hl=highlight(Q,o);
			}
			if (hl.text) {
				output[i].text=hl.text;
				output[i].hits=hl.hits;
				output[i].seq=seq;
				seq+=hl.hits.length;

				output[i].start=startvpos;				
			} else {
				output[i]=null; //remove item vpos less than opts.range.start
			}
		} 
		output=output.filter(function(o){return o!=null});
		cb(output);
	});
}
var injectTag=function(Q,opts){
	var hits=opts.hits;
	var tag=opts.tag||'hl';
	var output='',O=[],j=0;;
	var surround=opts.surround||5;

	var tokens=Q.tokenize(opts.text).tokens;
	var voff=opts.voff;
	var i=0,previnrange=!!opts.fulltext ,inrange=!!opts.fulltext;
	while (i<tokens.length) {
		inrange=opts.fulltext || (j<hits.length && voff+surround>=hits[j][0] ||
				(j>0 && j<=hits.length &&  hits[j-1][0]+surround*2>=voff));	

		if (previnrange!=inrange) {
			output+=opts.abridge||"...";
		}
		previnrange=inrange;

		if (Q.isSkip(tokens[i])) {
			if (inrange) output+=tokens[i];
			i++;
			continue;
		}
		if (i<tokens.length && j<hits.length && voff==hits[j][0]) {
			var nphrase=hits[j][1] % 10, width=hits[j][2];
			var tag=hits[j][3] || tag;
			if (width) {
				output+= '<'+tag+' n="'+nphrase+'">';
				while (width && i<tokens.length) {
					output+=tokens[i];
					if (!Q.isSkip(tokens[i])) {voff++;width--;}
					i++;
				}
				output+='</'+tag+'>';
			} else {
				output+= '<'+tag+' n="'+nphrase+'"/>';
			}
			while (j<hits.length && voff>hits[j][0]) j++;
		} else {
			if (inrange && i<tokens.length) output+=tokens[i];
			i++;
			voff++;
		}
		
	}
	var remain=10;
	while (i<tokens.length) {
		if (inrange) output+= tokens[i];
		i++;
		remain--;
		if (remain<=0) break;
	}
	O.push(output);
	output="";

	return O.join("");
}
var highlight=function(Q,opts) {
	if (!opts.text) return {text:"",hits:[]};
	var opt={text:opts.text,
		hits:null,tag:'hl',abridge:opts.abridge,voff:opts.startvpos,
		fulltext:opts.fulltext
	};

	opt.hits=hitInRange(opts.Q,opts.startvpos,opts.endvpos);
	return {text:injectTag(Q,opt),hits:opt.hits};
}

var getPage=function(engine,fileid,pageid,cb) {
	var fileOffsets=engine.get("fileOffsets");
	var pagekeys=["fileContents",fileid,pageid];
	var pagenames=engine.getFilePageNames(fileid);

	engine.get(pagekeys,function(text){
		cb.apply(engine.context,[{text:text,file:fileid,page:pageid,pagename:pagenames[pageid]}]);
	});
}

var highlightPage=function(Q,fileid,pageid,opts,cb) {
	if (typeof opts=="function") {
		cb=opts;
	}

	if (!Q || !Q.engine) return cb(null);
	var pageOffsets=Q.engine.getFilePageOffsets(fileid);
	var startvpos=pageOffsets[pageid];
	var endvpos=pageOffsets[pageid+1];
	var pagenames=Q.engine.getFilePageNames(fileid);

	this.getPage(Q.engine, fileid,pageid+1,function(res){
		var opt={text:res.text,hits:null,tag:'hl',voff:startvpos,fulltext:true};
		opt.hits=hitInRange(Q,startvpos,endvpos);
		var pagename=pagenames[pageid];
		cb.apply(Q.engine.context,[{text:injectTag(Q,opt),page:pageid,file:fileid,hits:opt.hits,pagename:pagename}]);
	})
}
module.exports={resultlist:resultlist, 
	hitInRange:hitInRange, 
	highlightPage:highlightPage,
	getPage:getPage};