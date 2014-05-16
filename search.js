var plist=require("./plist");
var boolsearch=require("./boolsearch");
var parseTerm = function(engine,raw,opts) {
	var res={raw:raw,variants:[],term:'',op:''};
	var term=raw, op=0;
	var firstchar=term[0];
	if (firstchar=='-') {
		term=term.substring(1);
		res.exclude=true; //exclude
	}
	term=term.trim();
	var lastchar=term[term.length-1];
	term=engine.customfunc.normalize(term);
	
	if (lastchar=='%') {
		throw "not implement yet"
		res.variants=getTermVariants.apply(this,[term.substring(0,term.length-1)]).variants;
		res.op='prefix'
	} else if (lastchar=='^') {
		//term=term.substring(0,term.length-1);
		res.op='exact';
	} else if (lastchar==',') {
		//term=term.substring(0,term.length-1);
	}
	res.key=term;
	return res;
}
var isWildcard=function(raw) {
	return !!raw.match(/[\*\?]/);
}

var isOrTerm=function(term) {
	term=term.trim();
	return (term[term.length-1]===',');
}
var orterm=function(engine,term,key) {
		var t={text:key};
		if (engine.customfunc.simplifiedToken) {
			t.simplified=engine.customfunc.simplifiedToken(key);
		}
		term.variants.push(t);
}
var orTerms=function(engine,tokens,now) {
	var raw=tokens[now];
	var term=parseTerm(engine,raw);
  orterm(engine,term,term.key);
	while (isOrTerm(raw))  {
		raw=tokens[++now];
		var term2=parseTerm(engine,raw);
		orterm(engine,term,term2.key);
		for (var i in term2.variants){
			term.variants[i]=term2.variants[i];
		}
		term.key+=','+term2.key;
	}
	return term;
}

var getOperator=function(raw) {
	var op='';
	if (raw[0]=='+') op='include';
	if (raw[0]=='-') op='exclude';
	return op;
}
var parsePhrase=function(q) {
	var match=q.match(/(".+?"|'.+?'|\S+)/g)
	match=match.map(function(str){
		var n=str.length, h=str.charAt(0), t=str.charAt(n-1)
		if (h===t&&(h==='"'|h==="'")) str=str.substr(1,n-2)
		return str;
	})
	return match;
}
var parseWildcard=function(raw) {
	var n=parseInt(raw,10) || 1;
	var qcount=raw.split('?').length-1;
	var scount=raw.split('*').length-1;
	var type='';
	if (qcount) type='?';
	else if (scount) type='*';
	return {wildcard:type, width: n , op:'wildcard'};
}

var newPhrase=function() {
	return {termid:[],posting:[],raw:''};
} 
var parseQuery=function(q) {
	var match=q.match(/(".+?"|'.+?'|\S+)/g)
	match=match.map(function(str){
		var n=str.length, h=str.charAt(0), t=str.charAt(n-1)
		if (h===t&&(h==='"'|h==="'")) str=str.substr(1,n-2)
		return str
	})
	//console.log(input,'==>',match)
	return match;
}
var loadPhrase=function(phrase) {
	/* remove leading and ending wildcard */
	var Q=this;
	var cache=Q.engine.postingCache;
	if (cache[phrase.key]) {
		phrase.posting=cache[phrase.key];
		return Q;
	}
	if (phrase.termid.length==1) {
		cache[phrase.key]=phrase.posting=Q.terms[phrase.termid[0]].posting;
		return Q;
	}
	var i=0, r=[],dis=0;
	while(i<phrase.termid.length) {
	  var T=Q.terms[phrase.termid[i]];
		if (0 === i) {
			r = T.posting;
		} else {
		    if (T.op=='wildcard') {
		    	T=Q.terms[phrase.termid[i++]];
		    	var width=T.width;
		    	var wildcard=T.wildcard;
		    	T=Q.terms[phrase.termid[i]];
		    	var mindis=dis;
		    	if (wildcard=='?') mindis=dis+width;
		    	if (T.exclude) r = plist.plnotfollow2(r, T.posting, mindis, dis+width);
		    	else r = plist.plfollow2(r, T.posting, mindis, dis+width);		    	
		    	dis+=(width-1);
		    }else {
		    	if (T.posting) {
		    		if (T.exclude) r = plist.plnotfollow(r, T.posting, dis);
		    		else r = plist.plfollow(r, T.posting, dis);
		    	}
		    }
		}
		dis++;	i++;
  }
  phrase.posting=r;
  cache[phrase.key]=r;
  return Q;
}
var newQuery =function(engine,query,opts) {
	if (!query) return;
	opts=opts||{};

	var phrases=query;
	if (typeof query=='string') {
		phrases=parseQuery(query);
	}
	
	var phrase_terms=[], terms=[],variants=[],termcount=0,operators=[];
	var pc=0,termid=0;//phrase count
	for  (var i=0;i<phrases.length;i++) {
		var op=getOperator(phrases[pc]);
		if (op) phrases[pc]=phrases[pc].substring(1);

		/* auto add + for natural order ?*/
		//if (!opts.rank && op!='exclude' &&i) op='include';
		operators.push(op);
		
		var j=0,tokens=engine.customfunc.tokenize(phrases[pc]).tokens;
		phrase_terms.push(newPhrase());
		while (j<tokens.length) {
			var raw=tokens[j];
			if (isWildcard(raw)) {
				if (phrase_terms[pc].termid.length==0)  { //skip leading wild card
					j++
					continue;
				}
				terms.push(parseWildcard(raw));
				termid=termcount++;
			} else if (isOrTerm(raw)){
				var term=orTerms.apply(this,[tokens,j]);
				terms.push(term);
				j+=term.key.split(',').length-1;
				termid=termcount++;
			} else {
				var term=parseTerm(engine,raw);
				termid=terms.map(function(a){return a.key}).indexOf(term.key);
				if (termid==-1) {
					terms.push(term);
					termid=termcount++;
				};
			}
			phrase_terms[pc].termid.push(termid);
			j++;
		}
		phrase_terms[pc].key=phrases[pc];

		//remove ending wildcard
		var P=phrase_terms[pc];
		do {
			T=terms[P.termid[P.termid.length-1]];
			if (!T) break;
			if (T.wildcard) P.termid.pop(); else break;
		} while(T);
		
		if (P.termid.length==0) {
			phrase_terms.pop();
		} else pc++;
	}
	opts.op=operators;

	var Q={engine:engine,opts:opts,query:query,
		phrases:phrase_terms,terms:terms,
		//load:load,groupBy:groupBy,run:run,
		//getPhraseWidth:highlight.getPhraseWidth,
		//highlight:highlight.highlight,
		//termFrequency:termFrequency,
		//slice:slice,
		//doc2slot:doc2slot,
		//indexOfSorted:plist.indexOfSorted,phase:0,
	};
	Q.tokenize=function() {return engine.customfunc.tokenize.apply(that,arguments);}
	//Q.getRange=function() {return that.getRange.apply(that,arguments)};
	//API.queryid='Q'+(Math.floor(Math.random()*10000000)).toString(16);
	return Q;
}
var loadPostings=function(engine,terms,cb) {
	var tokenkeys=terms.map(function(t){return ["tokens",t.key] });

	engine.gets(tokenkeys,function(postingid){
		var postingkeys=postingid.map(function(t){return ["postings",t]});
		
		engine.gets(postingkeys,function(postings){
			postings.map(function(p,i) { terms[i].posting=p });
			cb();
		})
	});
}
var groupBy=function(Q,posting) {
	phrases.forEach(function(P){
		var key=P.key;
		var docfreq=docfreqcache[key];
		if (!docfreq) docfreq=docfreqcache[key]={};
		if (!docfreq[that.groupunit]) {
			docfreq[that.groupunit]={doclist:null,freq:null};
		}		
		if (P.posting) {
			var res=matchPosting(engine,P.posting);
			P.freq=res.freq;
			P.docs=res.docs;
		} else {
			P.docs=[];
			P.freq=[];
		}
		docfreq[that.groupunit]={doclist:P.docs,freq:P.freq};
	});
	this.phase=2;
	return this;
}

var main=function(engine,q,opts,cb){
	opts=opts||q;

	var R={query:q,opts:opts,dbname:engine.dbname,result:[]};
	var Q=engine.queryCache[q];
	if (!Q) Q=newQuery(engine,q,opts);
	if (!Q || Q.phase==5) {
		cb.apply(engine.context,[R]);
		return R;
	}

	loadPostings(engine,Q.terms,function(){
		Q.phrases.forEach(loadPhrase.bind(Q));
	
		//groupBy();
		/*
		  client receive all folders and files by opening a database.

			return total hit
			hit groupby folder  [folderid:hit]
			hit groupby files.  [fileid:hit] only send with hit
			what happen if user add new file?
		

			excerpt on server side. ( cross multiple page excerpt)
			per page highlighting on client side.

		*/
		if (Q.phrases.length==1) {
			R.raw=Q.phrases[0].posting;
		}
		//boolsearch.search.apply(this,[opts]);

		cb.apply(engine.context,[R]);
	});
}

module.exports={
	main:main
};