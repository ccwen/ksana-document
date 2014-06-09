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

var resultlist=function(engine,Q,opts,cb) {
	var output=[];
	var files=engine.get("files");
	var fileOffsets=engine.get("fileOffsets");
	var max=opts.max || 20, count=0;

	var first=opts.range.start , start=0 , end;
	for (var i=0;i<fileOffsets.length;i++) {
		if (fileOffsets[i]>first) break;
		start=i;
	}
	var output=[];
	for (var i=start;i<Q.byFile.length;i++) {
		if (Q.byFile[i].length) {
			end=i;
			var pagewithhit=plist.groupbyposting2(Q.byFile[i],  files[i].pageOffset);
			pagewithhit.shift();
			for (var j=0;max>count && j<pagewithhit.length;j++) {
				if (!pagewithhit[j].length) continue;
				//var offsets=pagewithhit[j].map(function(p){return p- fileOffsets[i]});
				var name=files[i].pageNames[j];
				output.push(  {file:i, page:j,  pagename:name});
				count++;
			}
			if (count>=max) break;
		}
	}
	var pagekeys=output.map(function(p){
		return ["fileContents",p.file,p.page];
	});

	engine.get(pagekeys,function(pages){
		if (pages) for (var i=0;i<pages.length;i++) {
			var startvpos=files[output[i].file].pageOffset[output[i].page];
			var endvpos=files[output[i].file].pageOffset[output[i].page+1];
			var o={text:pages[i],startvpos:startvpos, endvpos: endvpos, Q:Q};
			var hl=highlight(Q,o);
			output[i].text=hl.text;
			output[i].hits=hl.hits;
			output[i].start=startvpos;
		}
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
	var i=0,previnrange=!!opts.full ,inrange=!!opts.full;
	while (i<tokens.length) {
		inrange=opts.full || (j<hits.length && voff+surround>=hits[j][0] ||
				(j>0 && j<=hits.length &&  hits[j-1][0]+surround*2>=voff));	

		if (previnrange!=inrange) {
			output+="...";
		}
		previnrange=inrange;

		if (Q.isSkip(tokens[i])) {
			if (inrange) output+=tokens[i];
			i++;
			continue;
		}
		if (j<hits.length && voff==hits[j][0]) {
			var nphrase=hits[j][1] % 10, width=hits[j][2];
			var tag=hits[j][3] || tag;
			if (width) {
				output+= '<'+tag+' n="'+nphrase+'">';
				while (width) {
					output+=tokens[i];
					if (!Q.isSkip(tokens[i])) {voff++;width--;}
					if (i>=tokens.length) break;
					i++;
				}
				output+='</'+tag+'>';
			} else {
				output+= '<'+tag+' n="'+nphrase+'"/>';
			}
			j++;
		} else {
			if (inrange) output+=tokens[i];
			i++;
			voff++;
		}
		
	}
	while (i<tokens.length) {
		if (inrange) output+= tokens[i];
		i++;
	}
	O.push(output);
	output="";

	return O.join("");
}
var highlight=function(Q,opts) {
	var opt={text:opts.text,
		hits:null,tag:'hl',abridged:opts.abridged,voff:opts.startvpos
	};
	opt.hits=hitInRange(opts.Q,opts.startvpos,opts.endvpos);
	return {text:injectTag(Q,opt),hits:opt.hits};
}

var getPageByName=function(engine,pagename,cb) {
	var files=engine.get("files");
	var fileOffsets=engine.get("fileOffsets");
	var file=-1,page=-1;
	for (var i=0;i<files.length;i++) {
		page=files[i].pageNames.indexOf(pagename);
		if (page>-1) {
			file=i;
			break;
		}
	}
	if (file==-1) return cb("");
	var pagekeys=["fileContents",file,page];
	engine.get(pagekeys,function(text){
		cb.apply(engine.context,[{text:text,file:file,page:page}]);
	});
}
var highlightPage=function(Q,pagename,opts,cb) {
	if (typeof opts=="function") {
		cb=opts;
	}

	if (!Q || !Q.engine) return cb(null);
	var files=Q.engine.get("files");
	getPageByName(Q.engine,pagename,function(page){
		var startvpos=files[page.file].pageOffset[page.page];
		var endvpos=files[page.file].pageOffset[page.page+1];

		var opt={text:page.text,hits:null,tag:'hl',voff:startvpos,full:true};
		opt.hits=hitInRange(Q,startvpos,endvpos);
		cb.apply(Q.engine.context,[{text:injectTag(Q,opt),hits:opt.hits}]);
	});
}
module.exports={resultlist:resultlist, hitInRange:hitInRange, highlightPage:highlightPage,getPageByName:getPageByName};