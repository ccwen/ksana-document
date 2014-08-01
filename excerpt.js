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

var getFileInfo=function(engine,arr,cb) {
	var taskqueue=[],out=[];
	for (var i=0;i<arr.length;i++) {
		taskqueue.push(
			(function(idx){
				return (
					function(data){
						if (typeof data=='object' && data.__empty) {
							 //not pushing the first call
						} else out.push(data);
						engine.get(["files",idx],true,taskqueue.shift());
					}
				);
		})(arr[i]));
	}
	//last call 
	taskqueue.push(function(data){
		out.push(data);
		cb(out);
	});
	taskqueue.shift()({__empty:true});
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

	var fileWithHits=[];
	for (var i=start;i<Q.byFile.length;i++) {
		if(Q.byFile[i].length>0) {
			fileWithHits.push(i);
			range.nextFileStart=i;
			if (fileWithHits.length>=filecount) {
				break;
			}
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
	getFileInfo(engine,fileWithHits,function(files) {
		var output=[];
		for (var i=0;i<files.length;i++) {
			var pagewithhit=plist.groupbyposting2(Q.byFile[ fileWithHits[i] ],  files[i].pageOffset);
			pagewithhit.shift(); //the first item is not used (0~Q.byFile[0] )
			for (var j=0; j<pagewithhit.length;j++) {
				if (!pagewithhit[j].length) continue;
				//var offsets=pagewithhit[j].map(function(p){return p- fileOffsets[i]});
				var name=files[i].pageNames[j];
				output.push(  {file: fileWithHits[i] , page:j,  pagename:name});
			}
		}

		var pagekeys=output.map(function(p){
			return ["fileContents",p.file,p.page];
		});
		//prepare the text
		engine.get(pagekeys,function(pages){
			var seq=0;
			if (pages) for (var i=0;i<pages.length;i++) {
				var k=fileWithHits.indexOf(output[i].file);
				var startvpos=files[k].pageOffset[output[i].page];
				var endvpos=files[k].pageOffset[output[i].page+1];
				var hl={};
				
				if (opts.nohighlight) {
					hl.text=pages[i];
					hl.hits=hitInRange(Q,startvpos,endvpos);
				} else {
					var o={text:pages[i],startvpos:startvpos, endvpos: endvpos, Q:Q};
					hl=highlight(Q,o);
				}
				output[i].text=hl.text;
				output[i].hits=hl.hits;
				output[i].seq=seq;
				seq+=hl.hits.length;

				output[i].start=startvpos;
				if (opts.range.maxhit && seq>opts.range.maxhit) {
					output.length=i;
					break;
				}
			}
			cb(output);
		});
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
		hits:null,tag:'hl',abridge:opts.abridge,voff:opts.startvpos
	};

	opt.hits=hitInRange(opts.Q,opts.startvpos,opts.endvpos);
	return {text:injectTag(Q,opt),hits:opt.hits};
}

var getPage=function(engine,fileid,pageid,cb) {
	var fileOffsets=engine.get("fileOffsets");
	var pagekeys=["fileContents",fileid,pageid];

	engine.get(pagekeys,function(text){
		cb.apply(engine.context,[{text:text,file:fileid,page:pageid}]);
	});
}

var highlightPage=function(Q,fileid,pageid,opts,cb) {
	if (typeof opts=="function") {
		cb=opts;
	}
	if (!Q || !Q.engine) return cb(null);

	getPage(Q.engine,fileid,pageid,function(page){
		Q.engine.get(["files",fileid,"pageOffset"],true,function(pageOffset){
			var startvpos=pageOffset[page.page];
			var endvpos=pageOffset[page.page+1];

			var opt={text:page.text,hits:null,tag:'hl',voff:startvpos,fulltext:true};
			opt.hits=hitInRange(Q,startvpos,endvpos);
			cb.apply(Q.engine.context,[{text:injectTag(Q,opt),hits:opt.hits}]);
		});
	});
}
module.exports={resultlist:resultlist, 
	hitInRange:hitInRange, 
	highlightPage:highlightPage,
	getPage:getPage};