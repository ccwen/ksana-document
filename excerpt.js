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

var resultlist=function(engine,Q,R,opts,cb) {
	var output=[];
	var files=engine.get("files");
	var fileOffsets=engine.get("fileOffsets");
	var max=opts.max || 20, count=0;

	var first=opts.range.start , start , end;
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
	var relativeHits=function(hits,startoffset) {
		return hits.map(function(h){
			return [h[0]-startoffset, h[1],h[2]];
		});
	}
	engine.get(pagekeys,function(pages){
		for (var i=0;i<pages.length;i++) {
			var startvpos=files[output[i].file].pageOffset[output[i].page];
			var endvpos=files[output[i].file].pageOffset[output[i].page+1];
			var o={text:pages[i],startvpos:startvpos, endvpos: endvpos, postings:output[3], Q:Q};
			output[i].text=highlight(Q,o);
			output[i].start=startvpos;
			output[i].hits=relativeHits(o.hits,startvpos);
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
	var i=0,previnrange=false,inrange=false;
	while (i<tokens.length) {
		inrange=(j<hits.length && voff+surround*2>=hits[j][0] ||
				(j>0 && j<=hits.length &&  hits[j-1][0]+surround>=voff));	

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
					if (i>=tokens.length) break;
					if (tokens[i][0]!='<') {voff++;width--;}
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
		}
		voff++;
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
	opts.hits=opt.hits=hitInRange(opts.Q,opts.startvpos,opts.endvpos);
	return injectTag(Q,opt);
}

module.exports={resultlist:resultlist};