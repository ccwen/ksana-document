/*
  Multiversion text with external durable markups
*/
var createMarkup=function(textlen,start,len,payload) {
	if (textlen==-1) textlen=1024*1024*1024; //max string size 1GB
	//the only function create a new markup instance, be friendly to V8 Hidden Class

	if (len<0) len=textlen;
	if (start<0) start=0;
	if (start>textlen) start=textlen;
	if (start+len>textlen) {
		len-=start+len-textlen;
		if (len<0) len=0;
	}

	return {start:start,len:len,payload:payload};
}
var cloneMarkup=function(m) {
	if (typeof m=='undefined') return null;
	return createMarkup(-1,m.start,m.len,JSON.parse(JSON.stringify(m.payload)));
}
var migrateMarkup=function(markup, rev) {
	var end=markup.start+markup.len;
	var newlen=(rev.payload.text.length-rev.len);
	var revend=rev.start+rev.len;
	var m=cloneMarkup(markup); //return a new copy

	if (end<=rev.start) return m;
	else if (revend<=markup.start) {
		m.start+=newlen;
		return m;
	} else { //overlap
		//  markup    x    xx      xx    xyz      xyyyz        xyz  
		//  delete   ---   ---    ---     ---      ---        ---     
		//  dout     |     |      |		   x        xz          z            
		//  insert   +++   +++    +++     +++      +++        +++
		//  iout     +++x  +++xx  +++xx  x+++yz   x+++yyyz    +++ xyz
		if (rev.start>markup.start) {
			adv=rev.start-markup.start;  //markup in advance of rev
			var remain=( markup.len -adv) + newlen ; // remaining character after 
			if (remain<0) remain=0;
			m.len = adv + remain ;
		} else {
			m.start=rev.start;
			behind=markup.start-rev.start;
			m.len=markup.len - (rev.len-behind);
		}
		if (m.len<0) m.len=0;
		return m;
	}
}
var applyChanges=function(sourcetext ,revisions) {
	revisions.sort(function(r1,r2){return r2.start-r1.start});
	var text2=sourcetext;
	revisions.map(function(r){
		text2=text2.substring(0,r.start)+r.payload.text+text2.substring(r.start+r.len);
	});
	return text2;
}
var addMarkup=function(start,len,payload) {
	this.__markups__().push(createMarkup(this.inscription.length,start, len, payload ));
}
var addRevision=function(start,len,str) {
	var valid=this.__revisions__().every(function(r) {
		return (r.start+r.len<=start || r.start>=start+len);
	})
	var newrevision=createMarkup(this.inscription.length,start,len,{text:str});
	if (valid) this.__revisions__().push(newrevision);
	return valid;
}
var addMarkups=function(newmarkups,opts) {
	if (!(newmarkups instanceof Array)) return;
	if (opts &&opts.clear) this.clearMarkups();
	var maxlength=this.inscription.length;
	var markups=this.__markups__();
	for (var i in newmarkups) {
		m=newmarkups[i];
		var newmarkup=createMarkup(maxlength, m.start, m.len, m.payload)
		markups.push(newmarkup);
	};
}
var addRevisions=function(newrevisions,opts) {
	if (!(newrevisions instanceof Array)) return;
	if (opts &&opts.clear) this.clearRevisions();
	var revisions=this.__revisions__();
	var maxlength=this.inscription.length;
	for (var i in newrevisions) {
		var m=newrevisions[i];
		var newrevision=createMarkup(maxlength, m.start, m.len, m.payload );
		revisions.push(newrevision);	
	}
}	
var downgradeMarkups=function(markups) {
	var downgraded=[];
	for (var i in markups) {
		var m=markups[i];
		this.revert.map(function(rev){
			m=migrateMarkup(m,rev);
		});
		downgraded.push(m);
	}
	return downgraded;
}
var upgradeMarkups=function(markups,revs) {
	var migratedmarkups=[];
	markups.map(function(m){
		revs.map(function(revs){
			m=migrateMarkup(m,revs);
		});
		migratedmarkups.push(m);
	})
	return migratedmarkups;
}

var upgradeMarkupsTo=function(M,targetPage) {
	var pg=targetPage, lineage=[], doc=this.doc;
	while (true) {
			var pid=pg.parentId;
			if (!pid) break; // root	
			if (pid==pg.id)break;
			lineage.unshift(pg);
			pg=doc.getPage(pid);
	}
	lineage.map(function(pg){
		var parentPage=doc.getPage(pg.parentId);
		var rev=revertRevision(pg.revert,parentPage.inscription);
		M=parentPage.upgradeMarkups(M,rev);
	})
	return M;
}

var downgradeMarkupsTo=function(M,targetPage) {
	var pg=this,doc=this.doc;
	var ancestorId=targetPage.id;
	while (true) {
			var pid=pg.parentId;
			if (!pid) break; // root	
			M=pg.downgradeMarkups(M);
			if (pid==ancestorId)break;
			pg=doc.getPage(pid);
	}
	return M;
}

var hasAncestor=function(ancestor) {
	var ancestorId=ancestor.id;
	var pg=this,doc=this.doc;
	
	while (true) {
		if (!pg.parentId) return false; // root	
		if (pg.parentId==ancestorId) return true;
		pg=doc.getPage(pg.parentId);
	}
	return false;
}
var getAncestors=function() {
	var pg=this,ancestor=[], doc=this.doc;
	while (true) {
			var pid=pg.parentId;
			if (!pid) break; // root	
			pg=doc.getPage(pid);
			ancestor.unshift(pg);
	}
	return ancestor;
}

var clear=function(M,start,len) { //return number of item removed
	var count=0;
	if (typeof start=='undefined') {
		count=M.length;
	  M.splice(0, M.length);
	  return count;
	}
	if (len<0) len=this.inscription.length;
	var end=start+len;
	for (var i=M.length-1;i>=0;--i) {
		if (M[i].start>=start && M[i].start+M[i].len<=end) {
			M.splice(i,1);
			count++;
		}
	}
	return count;
}
var clearRevisions=function(start,len) {
	clear.apply(this,[this.__revisions__(),start,len]);
}
var clearMarkups=function(start,len) {
	clear.apply(this,[this.__markups__(),start,len]);
}
var isLeafPage=function() {
	return (this.__mutant__().length==0);
}
var revertRevision=function(revs,parentinscription) {
	var revert=[], offset=0;
	revs.sort(function(m1,m2){return m1.start-m2.start});
	revs.map(function(r){
		var newinscription="";
		var	m=cloneMarkup(r);
		var newtext=parentinscription.substr(r.start,r.len);
		m.start+=offset;
		m.len=m.payload.text.length;
		m.payload.text=newtext;
		offset+=m.len-newtext.length;
		revert.push(m);
	})
	revert.sort(function(a,b){return b.start-a.start});
	return revert;
}
var markupAt=function(pos) {
	return this.__markups__().filter(function(m){
		var len=m.len;if (!m.len) len=1;
		return (pos>=m.start && pos<m.start+len);
	})
}
var revisionAt=function(pos) {
	return this.__revisions__().filter(function(m){
		return (pos>=m.start && pos<=m.start+m.len);
	})
}

var compressRevert=function(R) {
	var out=[];
	for (var i in R) {
		if (R[i].payload.text=="") {
			out.push({s:R[i].start,l:R[i].len})
		} else out.push({s:R[i].start,l:R[i].len,y:R[i].payload})
	}
	return out;
}
var decompressRevert=function(R) {
	var out=[];
	for (var i in R) {
		var payload=R[i].y;
		if (!payload) payload={text:""};
		out.push({start:R[i].s,len:R[i].l, payload:payload})
	}
	return out;
}

var toJSONString=function(opts) {
	var obj={};
	opts=opts||{};
	if (this.name) obj.n=this.name;
	if (opts.withtext) obj.t=this.inscription;
	if (this.parentId) obj.p=this.parentId;
	if (this.revert) obj.r=compressRevert(this.revert);
	var meta=this.__meta__();
	if (meta.daugtherStart) {
		obj.ds=meta.daugtherStart;
		obj.dc=meta.daugtherCount;
	}
	return JSON.stringify(obj);
}
var findMarkup=function(query) { //same like jquery
	var name=query.name;
	var output=[];
	this.__markups__().map(function(M){
		if (M.payload.name==name) {
			output.push(M);
		}
	})
	return output;
}
var fission=function(breakpoints,opts){
	var meta=this.__meta__();
	var movetags=function(newpage,start,end) {
		var M=this.__markups__();
		M.map(function(m){
			if (m.start>=start && m.start<end) {
				newpage.addMarkup(m.start-start,m.len, m.payload);
			}
		})
	}
	meta.daugtherStart=this.doc.version;
	meta.daugtherCount=breakpoints.length+1;
	/* create page ,add transclude from*/
	var start=0, t="";
	for (var i=0;i<=breakpoints.length;i++) {
		var end=breakpoints[i]||this.inscription.length
		t=this.inscription.substring(start,end);
		var transclude={id:this.id, start:start };//
		var newpage=this.doc.createPage({text:t, transclude:transclude});
		newpage.__setParentId__(this.id);
		movetags.apply(this,[newpage,start,end]);
		start=end;
	}

	//when convert to json, remove the inscription in origin text
	//and retrived from fission mutant
}
var newPage = function(opts) {
	var PG={};
	var inscription="";
	var hasInscription=false;
	var markups=[];
	var revisions=[];
	var mutant=[];

	opts=opts||{};
	opts.id=opts.id || 0; //root id==0
	var parentId=0 ,name="";
	if (typeof opts.parent==='object') {
		inscription=opts.parent.inscription;
		name=opts.parent.name;
		hasInscription=true;
		parentId=opts.parent.id;
	}
	var doc=opts.doc;
	var meta= {name:name,id:opts.id, parentId:parentId, revert:null };

	//these are the only 2 function changing inscription,use by Doc only
	checkLength=function(ins) {
		if (ins.length>doc.maxInscriptionLength) {
			console.error("exceed size");
			ins=ins.substring(0,maxInscriptionLength);
		}
		return ins;
	}
	PG.__selfEvolve__  =function(revs,M) { 
		//TODO ;make sure inscription is loaded
		var newinscription=applyChanges(inscription, revs);
		var migratedmarkups=[];
		meta.revert=revertRevision(revs,inscription);
		inscription=checkLength(newinscription);
		hasInscription=true;
		markups=upgradeMarkups(M,revs);
	}
	Object.defineProperty(PG,'inscription',{
		get : function() {
			if (meta.id==0) return ""; //root page
			if (hasInscription) return inscription;
			if (meta.daugtherStart) {
				inscription="";
				for (var i=0;i<meta.daugtherCount;i++) {//combine from daugther
					var pg=this.doc.getPage(meta.daugtherStart+i);
					inscription+=pg.inscription;
				}
			} else {
				var m=this.getMutant(0); //revert from Mutant
				inscription=checkLength(applyChanges(m.inscription,m.revert));				
			}
			hasInscription=true;
			return inscription;
	}});
	//protected functions
	PG.__markups__     = function() { return markups; }
	PG.__revisions__   = function() { return revisions;}
	PG.hasRevision     = function() { return revisions.length>0}
	Object.defineProperty(PG,'id',{value:meta.id});
	Object.defineProperty(PG,'doc',{value:doc});
	Object.defineProperty(PG,'parentId',{get:function() {return meta.parentId}});
	PG.__setParentId__ = function(i) { meta.parentId=i;	}
	PG.getMarkup       = function(i){ return cloneMarkup(markups[i])} //protect from modification
	Object.defineProperty(PG,'markupCount',{get:function(){return markups.length}});

	Object.defineProperty(PG,'revert',{get:function(){return meta.revert}});
	PG.__setRevert__   = function(r) { meta.revert=decompressRevert(r)}
	PG.__setDaugther__ = function(s,c) { meta.daugtherStart=s;meta.daugtherCount=c};
	PG.getRevision     = function(i) { return cloneMarkup(revisions[i])}
	PG.getMutant       = function(i) { return mutant[i] };
	PG.__mutant__      = function()  { return mutant};
	PG.__setmutant__   = function(c)  { mutant=c};
	Object.defineProperty(PG,'revisionCount',{get:function(){return revisions.length}});
		
	PG.setName           = function(n){ meta.name=n; return this}
	Object.defineProperty(PG,'name',{get:function(){return meta.name}});
	PG.__meta__        = function() {return meta};

	Object.defineProperty(PG,'daugtherStart',{get:function(){return meta.daugtherStart}});
	Object.defineProperty(PG,'daugtherCount',{get:function(){return meta.daugtherCount}});
	PG.clearRevisions    = clearRevisions;
	PG.clearMarkups      = clearMarkups;
	PG.addMarkup         = addMarkup;
	PG.addMarkups        = addMarkups;
	PG.addRevision       = addRevision;
	PG.addRevisions      = addRevisions;
	PG.hasAncestor       = hasAncestor;
	PG.upgradeMarkups    = upgradeMarkups;
	PG.downgradeMarkups  = downgradeMarkups;
	PG.upgradeMarkupsTo  = upgradeMarkupsTo;
	PG.downgradeMarkupsTo=downgradeMarkupsTo;
	PG.getAncestors      = getAncestors;
	PG.isLeafPage        = isLeafPage;
	PG.markupAt          = markupAt;
	PG.revisionAt        = revisionAt;
//	PG.getmutant          = getmutant;
	PG.toJSONString      = toJSONString;
	PG.findMarkup				 = findMarkup;
	PG.fission           = fission;

	return PG;
}
var createDocument = function(docjson) {
	var DOC={};
	var pages=[];
	var names={};
	var meta={doctype:"dg1.0"}

	var addPage=function(name) {
		if (!names[name]) {
			names[name]=pages.length-1;
		} else {
			if (typeof names[name]=='number') {
				names[name]=[names[name]];
			}
			names[name].push(pages.length-1)
		}
	}
	var createFromJSON=function(json) {
			rootPage.clearRevisions();
			var t=json.text||json.t;
			if (t) {
				rootPage.addRevision(0,0,json.text || json.t);
				var page=evolvePage(rootPage);				
			} else {
				var page=createPage();
			}
			var name=json.n||json.name||"";
			addPage(name);
			page.setName(name);
			if (json.p) page.__setParentId__(json.p);
			if (json.r) page.__setRevert__(json.r);
			if (json.ds) {
				page.__setDaugther__(json.ds,json.dc);
			}
			page.addMarkups(json.markups,true);
			page.addRevisions(json.revisions,true);
			return page;
	}

	var createPages=function(json) {
		var count=0;
		for (var i=1;i<json.length;i++) {
			createPage(json[i]);
		}
		//build mutant array
		pages.map(function(P,idx,pages){
			if (P.parentId) pages[P.parentId].__mutant__().push(P);
		});
		return this;
	}
	var createPage=function(input) {
		var id=pages.length;
		if (typeof input=='undefined' || typeof input.getMarkup=='function') {
			//root page
			var parent=input||0;
			var page=newPage({id:id,parent:parent,doc:DOC});
			pages.push(page) ;
		} else if (typeof input=='string') { 
			var page=createFromJSON({text:input});
		} else {
			var page=createFromJSON(input);
		}
		return page;
	}

	var evolvePage=function(pg,opts) {//apply revisions and upgrate markup
		if (opts && opts.preview) {
			var nextgen=newPage({parent:pg,doc:DOC});
		} else {
			var nextgen=createPage(pg);	
		}
		if (pg.id) pg.__mutant__().push(nextgen);
		nextgen.__selfEvolve__( pg.__revisions__() , pg.__markups__() );

		return nextgen;
	}

	var findMRCA=function(pg1,pg2) {
		var ancestors1=pg1.getAncestors();
		var ancestors2=pg2.getAncestors();
		var common=0; //rootPage id
		while (ancestors1.length && ancestors2.length
			  && ancestors1[0].id==ancestors2[0].id) {
			common=ancestors1[0];
			ancestors1.shift();ancestors2.shift();
		}
		return common;
	}

	var migrate=function(from,to) { //migrate markups of A to B
		if (typeof from=='number') from=this.getPage(from);
		var M=from.__markups__();
		var out=null;
		if (typeof to=='undefined') {
			out=from.downgradeMarkups(M);
		} else {
			if (typeof to=='number') to=this.getPage(to);
			if (from.id===to.id) {
				return M;
			} else if (to.hasAncestor(from)) {
				out=from.upgradeMarkupsTo(M,to);
			} else if (from.hasAncestor(to)){
				out=from.downgradeMarkupsTo(M,to);
			} else {
				var ancestor=findMRCA(from,to);
				out=from.downgradeMarkupsTo(M,ancestor);
				out=ancestor.upgradeMarkupsTo(out,to);
			}
		}
		return out;
	}
	var findPage=function(name) {
		for (var i=0;i<this.pageCount;i++) {
			if (name===pages[i].name) return pages[i];
		}
		return null;
	}
	var getLeafPages=function() {
		var arr=[];
		for (var i=0;i<this.pageCount;i++) {arr[i]=true;}
		for (var i=0;i<this.pageCount;i++) {
			var pid=pages[i].parentId;
			arr[pid]=false;
		}
		var leafpages=[];
		arr.map(function(p,i){ if (p) leafpages.push(i) });
		return {leafPages:leafpages, isLeafPages:arr};
	}
	
	var toJSONString=function() {
		var out=["["+JSON.stringify(meta)], s=",";
		var isLeafPages=this.getLeafPages().isLeafPages;
		for (var i=0;i<pages.length;i++) {
			if (i==0) continue;
			s+=pages[i].toJSONString({"withtext":isLeafPages[i]});
			out.push(s);
			s=",";
		}
		out[out.length-1]+="]";
		//make line number save as version number
		return out.join('\n');
	}


	var pageByName=function(name,version) {
		var parr=names[name];
		version=version||this.version;//return lastest if not specified
		if (parr instanceof Array) {
			var last=parr[0];
			for (var i=0;i<parr.length;i++ ) {
				if (parr[i]>version) break;
				last=parr[i];
			}
			return pages[last];
		} else return pages[parr];
	}

	var rootPage=createPage();

	DOC.getPage=function(id) {return pages[id]};
	/*
		external markups must be saved with version number.
	*/
	Object.defineProperty(DOC,'meta',{value:meta});
	Object.defineProperty(DOC,'maxInscriptionLength',{value:2048});
	Object.defineProperty(DOC,'version',{get:function(){return pages.length}});
	Object.defineProperty(DOC,'pageCount',{get:function(){return pages.length}});


	DOC.createPage=createPage;
	DOC.createPages=createPages;
	DOC.evolvePage=evolvePage;
	DOC.findMRCA=findMRCA;
	DOC.migrate=migrate; 
	DOC.downgrade=migrate; //downgrade to parent
	DOC.migrateMarkup=migrateMarkup; //for testing
	DOC.getLeafPages=getLeafPages;
	DOC.findPage=findPage;
	DOC.pageByName=pageByName;
	DOC.toJSONString=toJSONString;
	if (docjson) DOC.createPages(docjson);

	return DOC;
}
/*
	TODO move user markups to tags
*/
/*
var splitInscriptions=function(doc,starts) {
	var combined="",j=0;
	var inscriptions=[],oldunitoffsets=[0];
	for (var i=1;i<doc.pageCount;i++) {
		var page=doc.getPage(i);
		var pageStart=doc.maxInscriptionLength*i;
 		combined+=page.inscription;
		oldunitoffsets.push(combined.length);
	}
	var last=0,newunitoffsets=[0];
	starts.map(function(S){
		var till=oldunitoffsets[ S[0] ]+ S[1];
		newunitoffsets.push(till);
		inscriptions.push( combined.substring(last,till));
		last=till;
	})
	inscriptions.push( combined.substring(last));
	newunitoffsets.push(combined.length);
	return {inscriptions:inscriptions,oldunitoffsets:oldunitoffsets , newunitoffsets:newunitoffsets};
}

var sortedIndex = function (array, tofind) {
  var low = 0, high = array.length;
  while (low < high) {
    var mid = (low + high) >> 1;
    array[mid] < tofind ? low = mid + 1 : high = mid;
  }
  return low;
};

var addOldUnit=function() {
// convert old unit into tags 
}

var reunitTags=function(tags,R,newtagname) {
	var out=[];
	tags.map(function(T){
		if (T.name===newtagname) return;
		var tag=JSON.parse(JSON.stringify(T));
		var pos=R.oldunitoffsets[T.sunit]+T.soff;
		var p=sortedIndex(R.newunitoffsets,pos+1)-1;
		if (p==-1) p=0;
		tag.sunit=p;tag.soff=pos-R.newunitoffsets[p];

		eunit=T.eunit||T.sunit;eoff=T.eoff||T.soff;
		if (eunit!=T.sunit || eoff!=T.soff) {
			pos=R.oldunitoffsets[eunit]+eoff;
			p=sortedIndex(R.newunitoffsets,pos)-1;
			if (p==-1) p=0;
			if (eunit!=T.sunit) tag.eunit=p;
			if (eoff!=T.soff)   tag.eoff=pos-R.newunitoffsets[p];
		}
		out.push(tag);
	});
	return out;
}
var reunit=function(doc,tagname,opts) {
	var unitstarts=[];
	doc.tags.map(function(T){
		if (T.name===tagname)	unitstarts.push([T.sunit,T.soff]);
	});

	var R=splitInscriptions(doc,unitstarts);
	var newdoc=createDocument();
	R.inscriptions.map(function(text){newdoc.createPage(text)});

	newdoc.tags=reunitTags(doc.tags,R,tagname);
	return newdoc;
}
*/
// reunit is too complicated, change to fission
// a big chunk of text divide into smaller unit
//
module.exports={ createDocument: createDocument}